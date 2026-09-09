const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');

module.exports = {
  name: 'setgoodbye',
  description: 'Set channel tạm biệt',
  usage: ';setgoodbye #channel [message]',
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('setgoodbye')
    .setDescription('Set goodbye channel')
    .addChannelOption(opt => opt.setName('channel').setDescription('Goodbye channel').setRequired(true))
    .addStringOption(opt => opt.setName('message').setDescription('Custom goodbye message')),
  async execute(message, args) {
    const channel = message.mentions.channels.first();
    if (!channel) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'setgoodbye_invalid'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    db.setSetting(message.guild.id, 'goodbyeChannel', channel.id);
    const customMsg = args.slice(1).join(' ');
    if (customMsg) {
      db.setSetting(message.guild.id, 'goodbyeMsg', customMsg);
    }

    const embed = new EmbedBuilder()
      .setColor(config.embedColorSuccess)
      .setDescription(customMsg ? t(message.guild.id, 'goodbye_set_msg') : t(message.guild.id, 'setgoodbye_success', { channel: `${channel}` }))
      .setTimestamp();

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
  async executeSlash(interaction) {
    const channel = interaction.options.getChannel('channel');
    db.setSetting(interaction.guild.id, 'goodbyeChannel', channel.id);
    const customMsg = interaction.options.getString('message');
    if (customMsg) {
      db.setSetting(interaction.guild.id, 'goodbyeMsg', customMsg);
    }
    const embed = new EmbedBuilder()
      .setColor(config.embedColorSuccess)
      .setDescription(customMsg ? t(interaction.guild.id, 'goodbye_set_msg') : t(interaction.guild.id, 'setgoodbye_success', { channel: `${channel}` }))
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
