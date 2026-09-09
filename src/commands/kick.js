const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { t } = require('../languages');
const { createCase, buildCaseEmbed, logToChannel } = require('../cases');

module.exports = {
  name: 'kick',
  description: 'Kick một thành viên khỏi server',
  usage: ';kick @user [lý do]',
  permissions: [PermissionFlagsBits.KickMembers],
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason')),
  async execute(message, args) {
    const member = message.mentions.members.first();
    if (!member) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(`${t(message.guild.id, 'usage')} \`${config.prefix}kick @user [reason]\``);
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    if (!member.kickable) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'not_kickable'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    if (member.roles.highest.position >= message.member.roles.highest.position) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'higher_role'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    const reason = args.slice(1).join(' ') || t(message.guild.id, 'no_reason');
    await member.kick(reason);
    const caseEntry = createCase(message.guild.id, member.id, message.author.id, 'kick', reason, null);
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
    if (!member.kickable) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(interaction.guild.id, 'not_kickable'));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(interaction.guild.id, 'higher_role'));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    const reason = interaction.options.getString('reason') || t(interaction.guild.id, 'no_reason');
    await member.kick(reason);
    const caseEntry = createCase(interaction.guild.id, member.id, interaction.user.id, 'kick', reason, null);
    const embed = buildCaseEmbed(interaction.guild.id, caseEntry);
    await interaction.reply({ embeds: [embed] });
    await logToChannel(interaction.guild.id, interaction.client, buildCaseEmbed(interaction.guild.id, caseEntry));
  },
};
