const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { t } = require('../languages');
const { buildLeaderboardEmbed } = require('../xp');

module.exports = {
  name: 'leaderboard',
  description: 'Bảng xếp hạng XP server',
  usage: ';leaderboard',
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View server XP leaderboard'),
  async execute(message) {
    const embed = buildLeaderboardEmbed(message.guild.id, message.guild.name);
    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
