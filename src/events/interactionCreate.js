const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const { t } = require('../languages');
const { isAdmin } = require('../permissions');
const { isTicketChannel, canManageTicket, createTicket, closeTicket } = require('../ticket');

const commandCooldowns = new Map();

function checkCooldown(userId) {
  const now = Date.now();
  const last = commandCooldowns.get(userId);
  if (last && now - last < config.commandCooldown) return true;
  commandCooldowns.set(userId, now);
  return false;
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (interaction.isButton()) {
      if (interaction.customId === 'lang_vi' || interaction.customId === 'lang_en') {
        if (!isAdmin(interaction.guild, interaction.member)) {
          const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(interaction.guild.id, 'no_permission'));
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        const lang = interaction.customId === 'lang_vi' ? 'vi' : 'en';
        const db = require('../database');
        db.setSetting(interaction.guild.id, 'language', lang);
        const embed = new EmbedBuilder().setColor(config.embedColorSuccess).setDescription(t(interaction.guild.id, 'lang_selected'));
        await interaction.update({ embeds: [embed], components: [] });
        return;
      }

      if (interaction.customId === 'ticket_create') {
        try {
          const channel = await createTicket(interaction.guild, interaction.user, null, client);
          return interaction.reply({ content: t(interaction.guild.id, 'ticket_created', { channel: `${channel}` }), ephemeral: true });
        } catch (error) {
          if (error.message === 'already_open') {
            return interaction.reply({ content: t(interaction.guild.id, 'ticket_already_open'), ephemeral: true });
          }
          return interaction.reply({ content: t(interaction.guild.id, 'error'), ephemeral: true });
        }
      }

      if (interaction.customId === 'ticket_close') {
        if (!isTicketChannel(interaction.channel)) return;
        if (!interaction.member || !interaction.member.roles || !interaction.member.user) return;
        if (!canManageTicket(interaction.channel, interaction.member)) {
          return interaction.reply({ content: t(interaction.guild.id, 'no_permission'), ephemeral: true });
        }
        await interaction.update({ components: [] });
        await closeTicket(interaction.channel, interaction.member, null);
        setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
        return;
      }

      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    if (command.permissions && !isAdmin(interaction.guild, interaction.member)) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(interaction.guild.id, 'no_permission'));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (checkCooldown(interaction.user.id)) return;

    if (command.executeSlash) {
      try {
        await command.executeSlash(interaction, client);
      } catch (error) {
        console.error(`$LumiyaBot: Error executing slash ${interaction.commandName}:`, error);
        const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(interaction.guild.id, 'error'));
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [embed], ephemeral: true }).catch(() => {});
        } else {
          await interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
        }
      }
    } else {
      const args = [];
      for (const option of interaction.options.data) {
        if (option.value !== undefined) args.push(String(option.value));
      }
      const fakeMessage = {
        guild: interaction.guild,
        member: interaction.member,
        author: interaction.user,
        channel: interaction.channel,
        content: `${config.prefix}${interaction.commandName} ${args.join(' ')}`.trim(),
        reply: (opts) => interaction.reply(opts),
        mentions: {
          members: interaction.options.getMember('user') ? [interaction.options.getMember('user')] : [],
          roles: interaction.options.getRole('role') ? [interaction.options.getRole('role')] : [],
        },
      };
      try {
        await command.execute(fakeMessage, args, client);
      } catch (error) {
        console.error(`$LumiyaBot: Error executing fallback ${interaction.commandName}:`, error);
        const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(interaction.guild.id, 'error'));
        await interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
      }
    }
  },
};
