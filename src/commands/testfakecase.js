const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');
const { createCase, buildCaseEmbed, logToChannel } = require('../cases');

module.exports = {
  name: 'testfakecase',
  description: 'test - Tạo fake moderation case',
  usage: ';testfakecase <user> <type> [reason]',
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('testfakecase')
    .setDescription('test - Create a fake moderation case')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Case type')
        .setRequired(true)
        .addChoices(
          { name: 'Ban', value: 'ban' },
          { name: 'Unban', value: 'unban' },
          { name: 'Kick', value: 'kick' },
          { name: 'Mute', value: 'mute' },
          { name: 'Unmute', value: 'unmute' },
          { name: 'Warn', value: 'warn' },
          { name: 'Tempban', value: 'tempban' },
          { name: 'Purge', value: 'purge' },
          { name: 'Lock', value: 'lock' },
          { name: 'Unlock', value: 'unlock' },
        ),
    )
    .addStringOption(opt => opt.setName('reason').setDescription('Reason')),
  async execute(message, args) {
    const member = message.mentions.members.first();
    if (!member) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'testsetxp_no_user'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const type = args[1];
    const validTypes = ['ban', 'unban', 'kick', 'mute', 'unmute', 'warn', 'tempban', 'purge', 'lock', 'unlock'];
    if (!type || !validTypes.includes(type)) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'testfakecase_invalid_type'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const reason = args.slice(2).join(' ') || `Test ${type}`;
    const duration = type === 'mute' ? 60000 : type === 'tempban' ? 3600000 : null;
    const caseEntry = createCase(message.guild.id, member.id, message.author.id, type, reason, duration);

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

    const type = interaction.options.getString('type');
    const reason = interaction.options.getString('reason') || `Test ${type}`;
    const duration = type === 'mute' ? 60000 : type === 'tempban' ? 3600000 : null;
    const caseEntry = createCase(interaction.guild.id, member.id, interaction.user.id, type, reason, duration);

    const embed = buildCaseEmbed(interaction.guild.id, caseEntry);
    await interaction.reply({ embeds: [embed] });
    await logToChannel(interaction.guild.id, interaction.client, buildCaseEmbed(interaction.guild.id, caseEntry));
  },
};
