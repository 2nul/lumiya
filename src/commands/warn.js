const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');
const { createCase, buildCaseEmbed, logToChannel } = require('../cases');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'warn',
  description: 'Cảnh báo một thành viên',
  usage: ';warn @user [lý do]',
  permissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason')),
  async execute(message, args) {
    const member = message.mentions.members.first();
    if (!member) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'warn_no_user'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    if (member.roles.highest.position >= message.member.roles.highest.position) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'higher_role'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    const reason = args.slice(1).join(' ') || t(message.guild.id, 'no_reason');
    const prevWarnings = db.getActiveWarns(message.guild.id, member.id).length;
    const caseEntry = createCase(message.guild.id, member.id, message.author.id, 'warn', reason, null);
    db.addWarn(message.guild.id, member.id, caseEntry.id);
    const maxWarns = parseInt(db.getSetting(message.guild.id, 'maxWarns')) || config.defaultMaxWarns;
    const newCount = prevWarnings + 1;

    const embed = buildCaseEmbed(message.guild.id, caseEntry);
    await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    await logToChannel(message.guild.id, message.client, buildCaseEmbed(message.guild.id, caseEntry));

    if (newCount >= maxWarns) {
      try {
        await member.ban({ reason: t(message.guild.id, 'max_warn_action', { max: maxWarns, action: t(message.guild.id, 'auto_ban') }) });
        const autoCase = createCase(message.guild.id, member.id, message.client.user.id, 'ban', t(message.guild.id, 'max_warn_action', { max: maxWarns, action: t(message.guild.id, 'auto_ban') }), null);
        await logToChannel(message.guild.id, message.client, buildCaseEmbed(message.guild.id, autoCase));
      } catch {}
    }
  },
  async executeSlash(interaction) {
    const member = interaction.options.getMember('user');
    if (!member) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(interaction.guild.id, 'member_not_found'));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(interaction.guild.id, 'higher_role'));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    const reason = interaction.options.getString('reason') || t(interaction.guild.id, 'no_reason');
    const prevWarnings = db.getActiveWarns(interaction.guild.id, member.id).length;
    const caseEntry = createCase(interaction.guild.id, member.id, interaction.user.id, 'warn', reason, null);
    db.addWarn(interaction.guild.id, member.id, caseEntry.id);
    const maxWarns = parseInt(db.getSetting(interaction.guild.id, 'maxWarns')) || config.defaultMaxWarns;

    const embed = buildCaseEmbed(interaction.guild.id, caseEntry);
    await interaction.reply({ embeds: [embed] });
    await logToChannel(interaction.guild.id, interaction.client, buildCaseEmbed(interaction.guild.id, caseEntry));

    if (prevWarnings + 1 >= maxWarns) {
      try {
        await member.ban({ reason: t(interaction.guild.id, 'max_warn_action', { max: maxWarns, action: t(interaction.guild.id, 'auto_ban') }) });
        const autoCase = createCase(interaction.guild.id, member.id, interaction.client.user.id, 'ban', t(interaction.guild.id, 'max_warn_action', { max: maxWarns, action: t(interaction.guild.id, 'auto_ban') }), null);
        await logToChannel(interaction.guild.id, interaction.client, buildCaseEmbed(interaction.guild.id, autoCase));
      } catch {}
    }
  },
};
