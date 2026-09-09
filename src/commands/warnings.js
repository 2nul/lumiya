const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');

module.exports = {
  name: 'warnings',
  description: 'Xem cảnh báo của một thành viên',
  usage: ';warnings @user',
  permissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings of a member')
    .addUserOption(opt => opt.setName('user').setDescription('Target user')),
  async execute(message, args) {
    const member = message.mentions.members.first() || message.member;
    const warns = db.getUserWarnings(message.guild.id, member.id);

    if (warns.length === 0) {
      const embed = new EmbedBuilder().setColor(config.embedColorInfo).setDescription(t(message.guild.id, 'warnings_empty'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const lines = warns.map(w => {
      const caseEntry = db.getCase(message.guild.id, w.caseId);
      return `\`#${w.id}\` - ${caseEntry ? caseEntry.reason : 'N/A'} (<t:${Math.floor(w.createdAt / 1000)}:R>)`;
    });

    const embed = new EmbedBuilder()
      .setColor(config.embedColorWarn)
      .setTitle(t(message.guild.id, 'warnings_title', { user: member.user.username }))
      .setDescription(lines.join('\n'))
      .setFooter({ text: t(message.guild.id, 'warnings_count', { count: warns.length }) })
      .setTimestamp();

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
