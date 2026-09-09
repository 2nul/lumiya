const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');
const { buildCaseEmbed } = require('../cases');

module.exports = {
  name: 'case',
  description: 'Xem chi tiết một moderation case',
  usage: ';case <case_id>',
  permissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('case')
    .setDescription('View details of a moderation case')
    .addIntegerOption(opt => opt.setName('case_id').setDescription('Case ID').setRequired(true)),
  async execute(message, args) {
    const caseId = parseInt(args[0]);
    if (!caseId) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'case_usage'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const caseEntry = db.getCase(message.guild.id, caseId);
    if (!caseEntry) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'case_not_found'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const embed = buildCaseEmbed(message.guild.id, caseEntry);
    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
