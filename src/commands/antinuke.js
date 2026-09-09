const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');

module.exports = {
  name: 'antinuke',
  description: 'Bật/tắt Anti-Nuke',
  usage: ';antinuke',
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Toggle Anti-Nuke'),
  async execute(message) {
    const current = db.getSetting(message.guild.id, 'antinuke');
    const newValue = current === 'false' ? 'true' : 'false';
    db.setSetting(message.guild.id, 'antinuke', newValue);

    const embed = new EmbedBuilder()
      .setColor(newValue === 'true' ? config.embedColorSuccess : config.embedColorWarn)
      .setDescription(t(message.guild.id, 'antinuke_toggled', { status: t(message.guild.id, newValue === 'true' ? 'automod_status_on' : 'automod_status_off') }))
      .setTimestamp();

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
