const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');

module.exports = {
  name: 'setwelcome',
  description: 'Set channel chào mừng',
  usage: ';setwelcome #channel [message]',
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('setwelcome')
    .setDescription('Set welcome channel')
    .addChannelOption(opt => opt.setName('channel').setDescription('Welcome channel').setRequired(true))
    .addStringOption(opt => opt.setName('message').setDescription('Custom welcome message')),
  async execute(message, args) {
    const channel = message.mentions.channels.first();
    if (!channel) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'setwelcome_invalid'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    db.setSetting(message.guild.id, 'welcomeChannel', channel.id);
    const customMsg = args.slice(1).join(' ');
    if (customMsg) {
      db.setSetting(message.guild.id, 'welcomeMsg', customMsg);
    }

    const embed = new EmbedBuilder()
      .setColor(config.embedColorSuccess)
      .setDescription(customMsg ? t(message.guild.id, 'welcome_set_msg') : t(message.guild.id, 'setwelcome_success', { channel: `${channel}` }))
      .setTimestamp();

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
  async executeSlash(interaction) {
    const channel = interaction.options.getChannel('channel');
    db.setSetting(interaction.guild.id, 'welcomeChannel', channel.id);
    const customMsg = interaction.options.getString('message');
    if (customMsg) {
      db.setSetting(interaction.guild.id, 'welcomeMsg', customMsg);
    }
    const embed = new EmbedBuilder()
      .setColor(config.embedColorSuccess)
      .setDescription(customMsg ? t(interaction.guild.id, 'welcome_set_msg') : t(interaction.guild.id, 'setwelcome_success', { channel: `${channel}` }))
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
