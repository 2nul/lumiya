const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { t } = require('../languages');
const { isAdmin } = require('../permissions');
const { forceSave } = require('../database');

module.exports = {
  name: 'stop',
  description: 'Dừng bot',
  usage: ';stop',
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the bot'),
  async execute(message, args) {
    const guildId = message.guild.id;
    const userIsAdmin = isAdmin(message.guild, message.member);

    if (!userIsAdmin) {
      const embed = new EmbedBuilder()
        .setColor(config.embedColorError)
        .setDescription(t(guildId, 'no_permission'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const embed = new EmbedBuilder()
      .setColor(config.embedColorWarn)
      .setDescription(t(guildId, 'msg_shuttingdown'))
      .setTimestamp();

    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    forceSave();
    process.exit(0);
  },
};