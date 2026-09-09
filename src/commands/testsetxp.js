const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');

module.exports = {
  name: 'testsetxp',
  description: 'test - Đặt thông tin XP cho một user',
  usage: ';testsetxp <user> <level> [xp] [messages] [streak]',
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('testsetxp')
    .setDescription('test - Set XP data for a user')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addIntegerOption(opt => opt.setName('level').setDescription('Level').setRequired(true).setMinValue(0).setMaxValue(999))
    .addIntegerOption(opt => opt.setName('xp').setDescription('XP in current level (default 0)').setMinValue(0))
    .addIntegerOption(opt => opt.setName('messages').setDescription('Total messages (default 0)').setMinValue(0))
    .addIntegerOption(opt => opt.setName('streak').setDescription('Streak days (default 0)').setMinValue(0)),
  async execute(message, args) {
    const member = message.mentions.members.first();
    if (!member) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'testsetxp_no_user'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const level = db.clampInt(args[1], 0, db.MAX_LEVEL);
    const xp = db.clampInt(args[2], 0, db.MAX_XP);
    const messages = db.clampInt(args[3], 0, 1000000000);
    const streak = db.clampInt(args[4], 0, 1000000);

    const entry = db.setXP(message.guild.id, member.id, { level, xp, messages, streak, lastActive: new Date().toDateString() });

    const embed = new EmbedBuilder()
      .setColor(config.embedColorSuccess)
      .setTitle(t(message.guild.id, 'testsetxp_success'))
      .addFields(
        { name: 'User', value: `${member}`, inline: true },
        { name: 'Level', value: `${level}`, inline: true },
        { name: 'XP', value: `${xp}`, inline: true },
        { name: 'Messages', value: `${messages}`, inline: true },
        { name: 'Streak', value: `${streak}`, inline: true },
      )
      .setFooter({ text: `Max level: ${db.MAX_LEVEL} — Max XP/level: ${db.MAX_XP}` })
      .setTimestamp();

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
  async executeSlash(interaction) {
    const member = interaction.options.getMember('user');
    if (!member) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(interaction.guild.id, 'member_not_found'));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const level = interaction.options.getInteger('level');
    const xp = interaction.options.getInteger('xp') || 0;
    const messages = interaction.options.getInteger('messages') || 0;
    const streak = interaction.options.getInteger('streak') || 0;

    const entry = db.setXP(interaction.guild.id, member.id, { level, xp, messages, streak, lastActive: new Date().toDateString() });

    const embed = new EmbedBuilder()
      .setColor(config.embedColorSuccess)
      .setTitle(t(interaction.guild.id, 'testsetxp_success'))
      .addFields(
        { name: 'User', value: `${member}`, inline: true },
        { name: 'Level', value: `${level}`, inline: true },
        { name: 'XP', value: `${xp}`, inline: true },
        { name: 'Messages', value: `${messages}`, inline: true },
        { name: 'Streak', value: `${streak}`, inline: true },
      )
      .setFooter({ text: `Max level: ${db.MAX_LEVEL} — Max XP/level: ${db.MAX_XP}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
