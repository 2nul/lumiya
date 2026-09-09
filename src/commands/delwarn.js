const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');

module.exports = {
  name: 'delwarn',
  description: 'Xóa một cảnh báo',
  usage: ';delwarn <warn_id>',
  permissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('delwarn')
    .setDescription('Delete a warning')
    .addIntegerOption(opt => opt.setName('warn_id').setDescription('Warning ID').setRequired(true)),
  async execute(message, args) {
    const warnId = parseInt(args[0]);
    if (!warnId) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'delwarn_usage'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const warn = db.getWarn(message.guild.id, warnId);
    if (!warn) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'delwarn_not_found'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    db.removeWarn(message.guild.id, warnId);

    const embed = new EmbedBuilder()
      .setColor(config.embedColorSuccess)
      .setDescription(t(message.guild.id, 'delwarn_success', { id: warnId }))
      .setTimestamp();

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
