const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');

module.exports = {
  name: 'automod',
  description: 'Bật/tắt AutoMod',
  usage: ';automod',
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Toggle AutoMod'),
  async execute(message) {
    const current = db.getSetting(message.guild.id, 'automod');
    const newValue = current === 'false' ? 'true' : 'false';
    db.setSetting(message.guild.id, 'automod', newValue);

    const embed = new EmbedBuilder()
      .setColor(newValue === 'true' ? config.embedColorSuccess : config.embedColorWarn)
      .setDescription(t(message.guild.id, 'automod_toggled', { status: t(message.guild.id, newValue === 'true' ? 'automod_status_on' : 'automod_status_off') }))
      .setTimestamp();

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
