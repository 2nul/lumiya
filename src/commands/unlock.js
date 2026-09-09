const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { t } = require('../languages');
const { buildLogEmbed, logToChannel } = require('../cases');

module.exports = {
  name: 'unlock',
  description: 'Mở khóa kênh hiện tại',
  usage: ';unlock [lý do]',
  permissions: [PermissionFlagsBits.ManageChannels],
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock the current channel')
    .addStringOption(opt => opt.setName('reason').setDescription('Reason')),
  async execute(message, args) {
    const reason = args.join(' ') || t(message.guild.id, 'no_reason');
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
    const embed = new EmbedBuilder().setColor(config.embedColorSuccess).setDescription(t(message.guild.id, 'unlock_success')).setTimestamp();
    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    const logEmbed = buildLogEmbed(message.guild.id, `${t(message.guild.id, 'log_channel_unlock')} - ${message.channel}`, [
      { name: 'Moderator', value: `${message.member}`, inline: true },
      { name: 'Reason', value: reason },
    ]);
    await logToChannel(message.guild.id, message.client, logEmbed);
  },
  async executeSlash(interaction) {
    const reason = interaction.options.getString('reason') || t(interaction.guild.id, 'no_reason');
    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
    const embed = new EmbedBuilder().setColor(config.embedColorSuccess).setDescription(t(interaction.guild.id, 'unlock_success')).setTimestamp();
    await interaction.reply({ embeds: [embed] });
    const logEmbed = buildLogEmbed(interaction.guild.id, `${t(interaction.guild.id, 'log_channel_unlock')} - ${interaction.channel}`, [
      { name: 'Moderator', value: `${interaction.member}`, inline: true },
      { name: 'Reason', value: reason },
    ]);
    await logToChannel(interaction.guild.id, interaction.client, logEmbed);
  },
};
