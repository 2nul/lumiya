const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, ChannelType } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');

function isTextChannel(channel) {
  if (!channel) return false;
  if (typeof channel.isTextBased === 'function') return channel.isTextBased();
  return channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement;
}

function currentEmbed(guildId) {
  const musicChannelId = db.getSetting(guildId, 'musicChannel');
  if (musicChannelId) {
    return new EmbedBuilder()
      .setColor(config.embedColorInfo)
      .setDescription(t(guildId, 'setmusicchannel_current', { channel: `<#${musicChannelId}>` }));
  }
  return new EmbedBuilder()
    .setColor(config.embedColorInfo)
    .setDescription(t(guildId, 'setmusicchannel_none'));
}

module.exports = {
  name: 'setmusicchannel',
  description: 'Đặt kênh nghe nhạc (chỉ admin)',
  usage: ';setmusicchannel #channel | off',
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('setmusicchannel')
    .setDescription('Set the music channel (admin only)')
    .addChannelOption(opt => opt.setName('channel').setDescription('Music channel').setRequired(false))
    .addBooleanOption(opt => opt.setName('clear').setDescription('Remove the music channel restriction').setRequired(false)),
  async execute(message, args) {
    const guildId = message.guild.id;
    const sub = String(args[0] || '').toLowerCase();

    if (!sub) {
      return message.reply({ embeds: [currentEmbed(guildId)], allowedMentions: { repliedUser: false } });
    }

    if (sub === 'off' || sub === 'clear' || sub === 'xoa' || sub === 'xoá') {
      db.deleteSetting(guildId, 'musicChannel');
      const embed = new EmbedBuilder().setColor(config.embedColorSuccess).setDescription(t(guildId, 'setmusicchannel_cleared'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
    if (!isTextChannel(channel)) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(guildId, 'setmusicchannel_invalid'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    db.setSetting(guildId, 'musicChannel', channel.id);
    const embed = new EmbedBuilder()
      .setColor(config.embedColorSuccess)
      .setDescription(t(guildId, 'setmusicchannel_success', { channel: `${channel}` }))
      .setTimestamp();
    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
  async executeSlash(interaction) {
    const guildId = interaction.guild.id;

    if (interaction.options.getBoolean('clear')) {
      db.deleteSetting(guildId, 'musicChannel');
      const embed = new EmbedBuilder().setColor(config.embedColorSuccess).setDescription(t(guildId, 'setmusicchannel_cleared'));
      return interaction.reply({ embeds: [embed] });
    }

    const channel = interaction.options.getChannel('channel');
    if (!channel) {
      return interaction.reply({ embeds: [currentEmbed(guildId)] });
    }

    if (!isTextChannel(channel)) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(guildId, 'setmusicchannel_invalid'));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    db.setSetting(guildId, 'musicChannel', channel.id);
    const embed = new EmbedBuilder()
      .setColor(config.embedColorSuccess)
      .setDescription(t(guildId, 'setmusicchannel_success', { channel: `${channel}` }))
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  },
};