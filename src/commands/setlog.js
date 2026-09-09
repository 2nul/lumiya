const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');

module.exports = {
  name: 'setlog',
  description: 'Set channel log cho moderation',
  usage: ';setlog #channel',
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('setlog')
    .setDescription('Set moderation log channel')
    .addChannelOption(opt => opt.setName('channel').setDescription('Log channel').setRequired(true)),
  async execute(message, args) {
    const channel = message.mentions.channels.first();
    if (!channel) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'setlog_invalid'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    db.setSetting(message.guild.id, 'logChannel', channel.id);

    const embed = new EmbedBuilder()
      .setColor(config.embedColorSuccess)
      .setDescription(t(message.guild.id, 'setlog_success', { channel: `${channel}` }))
      .setTimestamp();

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
  async executeSlash(interaction) {
    const channel = interaction.options.getChannel('channel');
    db.setSetting(interaction.guild.id, 'logChannel', channel.id);
    const embed = new EmbedBuilder()
      .setColor(config.embedColorSuccess)
      .setDescription(t(interaction.guild.id, 'setlog_success', { channel: `${channel}` }))
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
