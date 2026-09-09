const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');

module.exports = {
  name: 'testresetxp',
  description: 'test - Reset XP của một user về 0',
  usage: ';testresetxp <user>',
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('testresetxp')
    .setDescription('test - Reset a user XP to 0')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)),
  async execute(message, args) {
    const member = message.mentions.members.first();
    if (!member) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'testsetxp_no_user'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const entry = db.setXP(message.guild.id, member.id, { level: 0, xp: 0, messages: 0, streak: 0, lastActive: null });

    const embed = new EmbedBuilder()
      .setColor(config.embedColorSuccess)
      .setDescription(t(message.guild.id, 'testresetxp_success', { user: `${member}` }))
      .setTimestamp();

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
  async executeSlash(interaction) {
    const member = interaction.options.getMember('user');
    if (!member) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(interaction.guild.id, 'member_not_found'));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    db.setXP(interaction.guild.id, member.id, { level: 0, xp: 0, messages: 0, streak: 0, lastActive: null });

    const embed = new EmbedBuilder()
      .setColor(config.embedColorSuccess)
      .setDescription(t(interaction.guild.id, 'testresetxp_success', { user: `${member}` }))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
