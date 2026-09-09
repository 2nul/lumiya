const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');

module.exports = {
  name: 'appeals',
  description: 'Xem danh sách kháng cáo đang chờ',
  usage: ';appeals',
  permissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('appeals')
    .setDescription('View pending appeals'),
  async execute(message) {
    const appeals = db.getAppeals(message.guild.id, 'pending');

    if (appeals.length === 0) {
      const embed = new EmbedBuilder().setColor(config.embedColorInfo).setDescription(t(message.guild.id, 'appeal_empty'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const lines = appeals.slice(0, 10).map(a => `\`${a.id}\` - <@${a.userId}> → Case #${a.caseId} - ${a.reason.substring(0, 50)}${a.reason.length > 50 ? '...' : ''}`);

    const embed = new EmbedBuilder()
      .setColor(config.embedColorInfo)
      .setTitle(t(message.guild.id, 'appeal_pending_title'))
      .setDescription(lines.join('\n'))
      .setFooter({ text: `${appeals.length} pending` })
      .setTimestamp();

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
