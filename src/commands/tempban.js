const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');
const { createCase, buildCaseEmbed, logToChannel } = require('../cases');
const { parseDuration, formatDuration } = require('../scheduler');

module.exports = {
  name: 'tempban',
  description: 'Ban tạm thời một thành viên',
  usage: ';tempban @user <thời gian> [lý do]',
  permissions: [PermissionFlagsBits.BanMembers],
  data: new SlashCommandBuilder()
    .setName('tempban')
    .setDescription('Temporarily ban a member')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 1h, 2d, 1w)').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason')),
  async execute(message, args) {
    const member = message.mentions.members.first();
    if (!member) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'tempban_invalid'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const durationStr = args[1];
    const durationMs = parseDuration(durationStr);
    if (!durationMs) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'tempban_invalid_time'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (!member.bannable) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'not_bannable'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (member.roles.highest.position >= message.member.roles.highest.position) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'higher_role'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const reason = args.slice(2).join(' ') || t(message.guild.id, 'no_reason');
    await member.ban({ reason: t(message.guild.id, 'tempban_reason', { reason }) });

    const caseEntry = createCase(message.guild.id, member.id, message.author.id, 'tempban', reason, durationMs);
    db.addTempAction(message.guild.id, member.id, 'tempban', Date.now() + durationMs, {});

    const embed = buildCaseEmbed(message.guild.id, caseEntry);
    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    await logToChannel(message.guild.id, message.client, buildCaseEmbed(message.guild.id, caseEntry));
  },
};
