const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { t } = require('../languages');
const { buildProfileEmbed } = require('../xp');

module.exports = {
  name: 'profile',
  description: 'Xem profile XP của thành viên',
  usage: ';profile [@user]',
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View XP profile of a member')
    .addUserOption(opt => opt.setName('user').setDescription('Target user')),
  async execute(message, args) {
    const member = message.mentions.members.first() || message.member;
    const embed = buildProfileEmbed(message.guild.id, member);
    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
