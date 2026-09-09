const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');

module.exports = {
  name: 'setautorole',
  description: 'Set auto-role khi member join',
  usage: ';setautorole @role',
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('setautorole')
    .setDescription('Set auto-role for new members')
    .addRoleOption(opt => opt.setName('role').setDescription('Role to auto-assign')),
  async execute(message, args) {
    if (args[0] === 'off') {
      db.setSetting(message.guild.id, 'autoRole', null);
      const embed = new EmbedBuilder().setColor(config.embedColorSuccess).setDescription(t(message.guild.id, 'setautorole_off'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const role = message.mentions.roles.first();
    if (!role) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'setautorole_invalid'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (role.position >= message.guild.members.me.roles.highest.position) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'higher_role'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    db.setSetting(message.guild.id, 'autoRole', role.id);

    const embed = new EmbedBuilder()
      .setColor(config.embedColorSuccess)
      .setDescription(t(message.guild.id, 'setautorole_success', { role: `${role}` }))
      .setTimestamp();

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
  async executeSlash(interaction) {
    const role = interaction.options.getRole('role');
    if (!role) {
      db.setSetting(interaction.guild.id, 'autoRole', null);
      const embed = new EmbedBuilder().setColor(config.embedColorSuccess).setDescription(t(interaction.guild.id, 'setautorole_off'));
      return interaction.reply({ embeds: [embed] });
    }
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(interaction.guild.id, 'higher_role'));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    db.setSetting(interaction.guild.id, 'autoRole', role.id);
    const embed = new EmbedBuilder()
      .setColor(config.embedColorSuccess)
      .setDescription(t(interaction.guild.id, 'setautorole_success', { role: `${role}` }))
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
