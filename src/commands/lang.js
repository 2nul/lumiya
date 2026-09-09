const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');

module.exports = {
  name: 'lang',
  description: 'Đổi ngôn ngữ bot',
  usage: ';lang <vi/en>',
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('lang')
    .setDescription('Change bot language')
    .addStringOption(opt => opt.setName('language').setDescription('Language').setRequired(true).addChoices(
      { name: 'Tiếng Việt', value: 'vi' },
      { name: 'English', value: 'en' },
    )),
  async execute(message, args) {
    const lang = args[0];
    if (!lang || !['vi', 'en'].includes(lang)) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lang_vi').setLabel('Tiếng Việt').setEmoji('🇻🇳').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('lang_en').setLabel('English').setEmoji('🇬🇧').setStyle(ButtonStyle.Secondary),
      );
      const embed = new EmbedBuilder().setColor(config.embedColorInfo).setTitle(t(message.guild.id, 'lang_title')).setDescription(t(message.guild.id, 'lang_desc'));
      return message.reply({ embeds: [embed], components: [row], allowedMentions: { repliedUser: false } });
    }

    db.setSetting(message.guild.id, 'language', lang);

    const embed = new EmbedBuilder()
      .setColor(config.embedColorSuccess)
      .setDescription(t(message.guild.id, 'lang_changed'))
      .setTimestamp();

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
