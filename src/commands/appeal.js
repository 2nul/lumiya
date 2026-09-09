const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');
const { logToChannel, buildLogEmbed } = require('../cases');

module.exports = {
  name: 'appeal',
  description: 'Gửi đơn kháng cáo cho một case',
  usage: ';appeal <case_id> [lý do]',
  data: new SlashCommandBuilder()
    .setName('appeal')
    .setDescription('Submit an appeal for a case')
    .addIntegerOption(opt => opt.setName('case_id').setDescription('Case ID').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for appeal')),
  async execute(message, args) {
    const caseId = parseInt(args[0]);
    if (!caseId) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'appeal_invalid'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const caseEntry = db.getCase(message.guild.id, caseId);
    if (!caseEntry) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'appeal_case_not_found'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (caseEntry.userId !== message.author.id) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'appeal_invalid'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const existingAppeals = db.getAppeals(message.guild.id).filter(a => a.userId === message.author.id && a.caseId === caseId && a.status === 'pending');
    if (existingAppeals.length > 0) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'appeal_already_appealed'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const reason = args.slice(1).join(' ') || t(message.guild.id, 'no_reason');
    const appeal = db.createAppeal(message.guild.id, message.author.id, caseId, reason);

    const embed = new EmbedBuilder()
      .setColor(config.embedColorInfo)
      .setTitle(`${t(message.guild.id, 'appeal_title', { id: appeal.id })}`)
      .addFields(
        { name: t(message.guild.id, 'appeal_user'), value: `${message.author}`, inline: true },
        { name: t(message.guild.id, 'appeal_case'), value: `#${caseId}`, inline: true },
        { name: t(message.guild.id, 'appeal_reason'), value: reason },
        { name: t(message.guild.id, 'appeal_status'), value: t(message.guild.id, 'appeal_status_pending') },
      )
      .setTimestamp();

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });

    const logEmbed = buildLogEmbed(message.guild.id, `${t(message.guild.id, 'log_appeal')} - #${appeal.id}`, [
      { name: t(message.guild.id, 'appeal_user'), value: `${message.author}`, inline: true },
      { name: t(message.guild.id, 'appeal_case'), value: `#${caseId}`, inline: true },
      { name: t(message.guild.id, 'appeal_reason'), value: reason },
    ], config.embedColorInfo);
    await logToChannel(message.guild.id, message.client, logEmbed);
  },
};
