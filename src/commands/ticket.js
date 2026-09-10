const { ChannelType, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');
const { isAdmin } = require('../permissions');
const { isTicketChannel, canManageTicket, canCloseTicket, buildCloseModal, createTicket, closeTicket } = require('../ticket');

async function sendPanel(channel) {
  const embed = new EmbedBuilder()
    .setColor(config.embedColorInfo)
    .setTitle(t(channel.guild.id, 'ticket_panel_title'))
    .setDescription(t(channel.guild.id, 'ticket_panel_desc'))
    .setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_create').setLabel(t(channel.guild.id, 'ticket_button')).setEmoji('🎫').setStyle(ButtonStyle.Primary),
  );
  await channel.send({ embeds: [embed], components: [row] });
}

module.exports = {
  name: 'ticket',
  description: 'Hệ thống Ticket — tạo và quản lý ticket hỗ trợ',
  usage: ';ticket setup | ;ticket create [lý do] | ;ticket close | ;ticket add @user | ;ticket remove @user | ;ticket panel',
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket system — create and manage support tickets')
    .addSubcommand(sub => sub.setName('setup').setDescription('(Admin) Auto create ticket category + panel'))
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Create a support ticket')
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for the ticket')))
    .addSubcommand(sub => sub
      .setName('close')
      .setDescription('Close the current ticket (admins only)'))
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Add a member to the ticket')
      .addUserOption(opt => opt.setName('user').setDescription('Member to add').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove a member from the ticket')
      .addUserOption(opt => opt.setName('user').setDescription('Member to remove').setRequired(true)))
    .addSubcommand(sub => sub.setName('panel').setDescription('(Admin) Send ticket panel')),
  async execute(message, args) {
    const sub = (args[0] || 'help').toLowerCase();

    if (sub === 'setup') {
      if (!isAdmin(message.guild, message.member)) {
        const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'no_permission'));
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }
      try {
        let category = message.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === '🎫 Tickets');
        if (!category) category = await message.guild.channels.create({ name: '🎫 Tickets', type: ChannelType.GuildCategory });
        db.setSetting(message.guild.id, 'ticketCategory', category.id);

        let panelChannel = message.guild.channels.cache.find(c => c.name === 'ticket-panel' && c.type === ChannelType.GuildText);
        if (!panelChannel) panelChannel = await message.guild.channels.create({ name: 'ticket-panel', type: ChannelType.GuildText, parent: category.id });
        db.setSetting(message.guild.id, 'ticketPanelChannel', panelChannel.id);

        const embed = new EmbedBuilder()
          .setColor(config.embedColorSuccess)
          .setDescription(t(message.guild.id, 'ticket_setup_done', { panel: `${panelChannel}`, category: category.name }));
        await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        await sendPanel(panelChannel);
      } catch (error) {
        const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(`Error: ${error.message}`);
        message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }
      return;
    }

    if (sub === 'panel') {
      if (!isAdmin(message.guild, message.member)) {
        const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'no_permission'));
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }
      await sendPanel(message.channel);
      const embed = new EmbedBuilder().setColor(config.embedColorSuccess).setDescription(t(message.guild.id, 'ticket_panel_sent'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (sub === 'create') {
      const reason = args.slice(1).join(' ') || null;
      try {
        const channel = await createTicket(message.guild, message.author, reason, message.client);
        const embed = new EmbedBuilder()
          .setColor(config.embedColorSuccess)
          .setDescription(t(message.guild.id, 'ticket_created', { channel: `${channel}` }));
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      } catch (error) {
        const embed = new EmbedBuilder()
          .setColor(config.embedColorError)
          .setDescription(error.message === 'already_open' ? t(message.guild.id, 'ticket_already_open') : t(message.guild.id, 'error'));
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }
    }

    if (!isTicketChannel(message.channel)) {
      const embed = new EmbedBuilder().setColor(config.embedColorError)
        .setDescription(`${t(message.guild.id, 'ticket_usage')}\n\n**Setup:** \`${config.prefix}ticket setup\`\n**Create:** \`${config.prefix}ticket create [lý do]\`\n**Close:** \`${config.prefix}ticket close\`\n**Add/Remove:** \`${config.prefix}ticket add @user\` / \`${config.prefix}ticket remove @user\``);
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (sub === 'close') {
      if (!canCloseTicket(message.channel, message.member)) {
        const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'no_permission'));
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }
      const reason = args.slice(1).join(' ') || null;
      if (!reason) {
        const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'ticket_close_need_reason'));
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }
      const embed = new EmbedBuilder().setColor(config.embedColorSuccess).setDescription(t(message.guild.id, 'ticket_closing_soon'));
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      await closeTicket(message.channel, message.member, reason);
      setTimeout(() => message.channel.delete().catch(() => {}), 3000);
      return;
    }

    if (sub === 'add' || sub === 'remove') {
      if (!canManageTicket(message.channel, message.member)) {
        const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'no_permission'));
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }
      const target = message.mentions.members.first();
      if (!target) {
        const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'ticket_no_user'));
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }
      try {
        if (sub === 'add') {
          await message.channel.permissionOverwrites.edit(target.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
        } else {
          await message.channel.permissionOverwrites.edit(target.id, { ViewChannel: false });
        }
        const embed = new EmbedBuilder().setColor(config.embedColorSuccess)
          .setDescription(t(message.guild.id, sub === 'add' ? 'ticket_added' : 'ticket_removed', { user: target.toString() }));
        await message.channel.send({ embeds: [embed] });
      } catch {
        const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'error'));
        await message.channel.send({ embeds: [embed] });
      }
      return;
    }

    const embed = new EmbedBuilder().setColor(config.embedColorInfo).setDescription(t(message.guild.id, 'ticket_usage'));
    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'setup' || sub === 'panel') {
      if (!isAdmin(interaction.guild, interaction.member)) {
        const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(interaction.guild.id, 'no_permission'));
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      if (sub === 'setup') {
        try {
          let category = interaction.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === '🎫 Tickets');
          if (!category) category = await interaction.guild.channels.create({ name: '🎫 Tickets', type: ChannelType.GuildCategory });
          db.setSetting(interaction.guild.id, 'ticketCategory', category.id);
          let panelChannel = interaction.guild.channels.cache.find(c => c.name === 'ticket-panel' && c.type === ChannelType.GuildText);
          if (!panelChannel) panelChannel = await interaction.guild.channels.create({ name: 'ticket-panel', type: ChannelType.GuildText, parent: category.id });
          db.setSetting(interaction.guild.id, 'ticketPanelChannel', panelChannel.id);
          const embed = new EmbedBuilder().setColor(config.embedColorSuccess)
            .setDescription(t(interaction.guild.id, 'ticket_setup_done', { panel: `${panelChannel}`, category: category.name }));
          await interaction.reply({ embeds: [embed], ephemeral: true });
          await sendPanel(panelChannel);
        } catch (error) {
          await interaction.reply({ content: `Error: ${error.message}`, ephemeral: true });
        }
      } else {
        await sendPanel(interaction.channel);
        const embed = new EmbedBuilder().setColor(config.embedColorSuccess).setDescription(t(interaction.guild.id, 'ticket_panel_sent'));
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
      return;
    }

    if (sub === 'create') {
      const reason = interaction.options.getString('reason') || null;
      const channel = await createTicket(interaction.guild, interaction.user, reason, interaction.client).catch(() => null);
      if (!channel) {
        return interaction.reply({ content: t(interaction.guild.id, 'ticket_already_open'), ephemeral: true });
      }
      const embed = new EmbedBuilder().setColor(config.embedColorSuccess).setDescription(t(interaction.guild.id, 'ticket_created', { channel: `${channel}` }));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (!isTicketChannel(interaction.channel)) {
      return interaction.reply({ content: t(interaction.guild.id, 'ticket_usage'), ephemeral: true });
    }

    if (sub === 'close') {
      if (!canCloseTicket(interaction.channel, interaction.member)) {
        return interaction.reply({ content: t(interaction.guild.id, 'no_permission'), ephemeral: true });
      }
      return interaction.showModal(buildCloseModal(interaction.guild.id));
    }

    if (sub === 'add' || sub === 'remove') {
      if (!canManageTicket(interaction.channel, interaction.member)) {
        return interaction.reply({ content: t(interaction.guild.id, 'no_permission'), ephemeral: true });
      }
      const target = interaction.options.getMember('user');
      if (!target) return interaction.reply({ content: t(interaction.guild.id, 'ticket_no_user'), ephemeral: true });
      try {
        if (sub === 'add') {
          await interaction.channel.permissionOverwrites.edit(target.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
        } else {
          await interaction.channel.permissionOverwrites.edit(target.id, { ViewChannel: false });
        }
        const embed = new EmbedBuilder().setColor(config.embedColorSuccess)
          .setDescription(t(interaction.guild.id, sub === 'add' ? 'ticket_added' : 'ticket_removed', { user: target.toString() }));
        await interaction.reply({ embeds: [embed] });
      } catch {
        await interaction.reply({ content: t(interaction.guild.id, 'error'), ephemeral: true });
      }
    }
  },
};