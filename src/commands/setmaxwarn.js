const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');

module.exports = {
  name: 'setmaxwarn',
  description: 'Set số cảnh báo tối đa trước khi auto-action',
  usage: ';setmaxwarn <số>',
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('setmaxwarn')
    .setDescription('Set max warnings before auto-action')
    .addIntegerOption(opt => opt.setName('amount').setDescription('Max warnings (1-50)').setRequired(true).setMinValue(1).setMaxValue(50)),
  async execute(message, args) {
    const count = parseInt(args[0]);
    if (!count || count < 1 || count > 50) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'setmaxwarn_invalid'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    db.setSetting(message.guild.id, 'maxWarns', count);

    const embed = new EmbedBuilder()
      .setColor(config.embedColorSuccess)
      .setDescription(t(message.guild.id, 'setmaxwarn_success', { count }))
      .setTimestamp();

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
