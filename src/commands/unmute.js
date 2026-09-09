const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { t } = require('../languages');
const { createCase, buildCaseEmbed, logToChannel } = require('../cases');

module.exports = {
  name: 'unmute',
  description: 'Gỡ timeout cho một thành viên',
  usage: ';unmute @user',
  permissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove timeout from a member')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)),
  async execute(message, args) {
    const member = message.mentions.members.first();
    if (!member) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(`${t(message.guild.id, 'usage')} \`${config.prefix}unmute @user\``);
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    if (!member.isCommunicationDisabled()) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'not_muted'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    await member.timeout(null);
    const caseEntry = createCase(message.guild.id, member.id, message.author.id, 'unmute', null, null);
    const embed = buildCaseEmbed(message.guild.id, caseEntry);
    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    await logToChannel(message.guild.id, message.client, buildCaseEmbed(message.guild.id, caseEntry));
  },
  async executeSlash(interaction) {
    const member = interaction.options.getMember('user');
    if (!member) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(interaction.guild.id, 'member_not_found'));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    if (!member.isCommunicationDisabled()) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(interaction.guild.id, 'not_muted'));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    await member.timeout(null);
    const caseEntry = createCase(interaction.guild.id, member.id, interaction.user.id, 'unmute', null, null);
    const embed = buildCaseEmbed(interaction.guild.id, caseEntry);
    await interaction.reply({ embeds: [embed] });
    await logToChannel(interaction.guild.id, interaction.client, buildCaseEmbed(interaction.guild.id, caseEntry));
  },
};
