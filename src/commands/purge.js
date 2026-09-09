const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { t } = require('../languages');

module.exports = {
  name: 'purge',
  description: 'Xóa một số lượng tin nhắn trong kênh',
  usage: ';purge <số tin nhắn>',
  permissions: [PermissionFlagsBits.ManageMessages],
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete messages in this channel')
    .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages').setRequired(true).setMinValue(1).setMaxValue(100)),
  async execute(message, args) {
    const amount = parseInt(args[0]);
    if (!amount || amount < 1 || amount > 100) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'purge_invalid'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    await message.delete().catch(() => {});
    const deleted = await message.channel.bulkDelete(amount, true);
    const embed = new EmbedBuilder().setColor(config.embedColorSuccess).setDescription(t(message.guild.id, 'purge_success', { count: deleted.size }));
    const msg = await message.channel.send({ embeds: [embed] });
    setTimeout(() => msg.delete().catch(() => {}), 3000);
  },
  async executeSlash(interaction) {
    const amount = interaction.options.getInteger('amount');
    await interaction.deferReply();
    const deleted = await interaction.channel.bulkDelete(amount, true);
    const embed = new EmbedBuilder().setColor(config.embedColorSuccess).setDescription(t(interaction.guild.id, 'purge_success', { count: deleted.size }));
    await interaction.editReply({ embeds: [embed] });
  },
};
