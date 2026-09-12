const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');

module.exports = {
  name: 'settings',
  description: 'Xem cài đặt server',
  usage: ';settings',
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('View server settings'),
  async execute(message) {
    const guildId = message.guild.id;
    const s = db.getAllSettings(guildId);

    const yes = '✅';
    const no = '';
    const off = '⬜';

    const embed = new EmbedBuilder()
      .setColor(config.embedColorInfo)
      .setTitle(`${t(guildId, 'settings_title')} - ${message.guild.name}`)
      .addFields(
        { name: t(guildId, 'settings_language'), value: s.language || 'vi', inline: true },
        { name: t(guildId, 'settings_log_channel'), value: s.logChannel ? `<#${s.logChannel}>` : t(guildId, 'settings_none'), inline: true },
        { name: t(guildId, 'settings_welcome_channel'), value: s.welcomeChannel ? `<#${s.welcomeChannel}>` : t(guildId, 'settings_none'), inline: true },
        { name: t(guildId, 'settings_goodbye_channel'), value: s.goodbyeChannel ? `<#${s.goodbyeChannel}>` : t(guildId, 'settings_none'), inline: true },
        { name: t(guildId, 'settings_auto_role'), value: s.autoRole ? `<@&${s.autoRole}>` : t(guildId, 'settings_none'), inline: true },
        { name: t(guildId, 'settings_max_warns'), value: s.maxWarns || `${config.defaultMaxWarns}`, inline: true },
        { name: t(guildId, 'settings_automod'), value: s.automod === 'false' ? no : yes, inline: true },
        { name: t(guildId, 'settings_antinuke'), value: s.antinuke === 'false' ? no : yes, inline: true },
      )
      .setTimestamp();

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
