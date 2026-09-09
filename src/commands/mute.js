const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');
const { createCase, buildCaseEmbed, logToChannel } = require('../cases');
const { parseDuration, formatDuration } = require('../scheduler');

module.exports = {
  name: 'mute',
  description: 'Timeout một thành viên (phút)',
  usage: ';mute @user <phút> [lý do]',
  permissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a member')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addIntegerOption(opt => opt.setName('minutes').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason')),
  async execute(message, args) {
    const member = message.mentions.members.first();
    if (!member) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(`${t(message.guild.id, 'usage')} \`${config.prefix}mute @user <minutes> [reason]\``);
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    const duration = parseInt(args[1]);
    if (!duration || duration < 1 || duration > 40320) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'invalid_duration'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    if (member.roles.highest.position >= message.member.roles.highest.position) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'higher_role'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    const reason = args.slice(2).join(' ') || t(message.guild.id, 'no_reason');
    const ms = duration * 60 * 1000;
    await member.timeout(ms, reason);
    const caseEntry = createCase(message.guild.id, member.id, message.author.id, 'mute', reason, ms);
    db.addTempAction(message.guild.id, member.id, 'tempmute', Date.now() + ms, {});
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
    const duration = interaction.options.getInteger('minutes');
    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(interaction.guild.id, 'higher_role'));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    const reason = interaction.options.getString('reason') || t(interaction.guild.id, 'no_reason');
    const ms = duration * 60 * 1000;
    await member.timeout(ms, reason);
    const caseEntry = createCase(interaction.guild.id, member.id, interaction.user.id, 'mute', reason, ms);
    db.addTempAction(interaction.guild.id, member.id, 'tempmute', Date.now() + ms, {});
    const embed = buildCaseEmbed(interaction.guild.id, caseEntry);
    await interaction.reply({ embeds: [embed] });
    await logToChannel(interaction.guild.id, interaction.client, buildCaseEmbed(interaction.guild.id, caseEntry));
  },
};
