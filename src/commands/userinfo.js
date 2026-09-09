const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');

module.exports = {
  name: 'userinfo',
  description: 'Xem thông tin của một thành viên',
  usage: ';userinfo [@user]',
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('View information about a member')
    .addUserOption(opt => opt.setName('user').setDescription('Target user')),
  async execute(message, args) {
    const member = message.mentions.members.first() || message.member;
    const user = member.user;
    const guildId = message.guild.id;

    const flags = user.flags ? user.flags.toArray().map(f => f.replace(/_/g, ' ')).join(', ') || 'N/A' : 'N/A';
    const cases = db.getUserCases(guildId, member.id);
    const warns = db.getUserWarnings(guildId, member.id);

    const embed = new EmbedBuilder()
      .setColor(config.embedColorInfo)
      .setTitle(`${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Tên hiển thị', value: member.displayName || user.username, inline: true },
        { name: 'Bot', value: user.bot ? 'Có' : 'Không', inline: true },
        { name: 'Ngày tạo tài khoản', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Ngày vào server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: 'Badges', value: flags, inline: true },
        { name: 'Moderation cases', value: `${cases.length}`, inline: true },
        { name: 'Active warnings', value: `${warns.length}`, inline: true },
        { name: 'Roles', value: member.roles.cache.size > 1 ? member.roles.cache.filter(r => r.id !== message.guild.id).map(r => r).join(' ') : 'Không có', inline: false },
      )
      .setTimestamp()
      .setFooter({ text: `Yêu cầu bởi ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
