const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');
const { logToChannel, buildLogEmbed } = require('../cases');

module.exports = {
  name: 'resolveappeal',
  description: 'Chấp nhận hoặc từ chối kháng cáo',
  usage: ';resolveappeal <id> accept/deny [lý do]',
  permissions: [PermissionFlagsBits.BanMembers],
  data: new SlashCommandBuilder()
    .setName('resolveappeal')
    .setDescription('Accept or deny an appeal')
    .addIntegerOption(opt => opt.setName('id').setDescription('Appeal ID').setRequired(true))
    .addStringOption(opt => opt.setName('action').setDescription('Action').setRequired(true).addChoices(
      { name: 'Accept', value: 'accept' },
      { name: 'Deny', value: 'deny' },
    ))
    .addStringOption(opt => opt.setName('note').setDescription('Admin note')),
  async execute(message, args) {
    const appealId = parseInt(args[0]);
    const action = args[1];

    if (!appealId || !action || !['accept', 'deny'].includes(action)) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'appeal_invalid_action'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const appeal = db.getAppeal(message.guild.id, appealId);
    if (!appeal) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'appeal_not_found'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const note = args.slice(2).join(' ') || null;
    const status = action === 'accept' ? 'accepted' : 'denied';
    db.updateAppeal(message.guild.id, appealId, { status, adminNote: note, reviewedBy: message.author.id });

    const embed = new EmbedBuilder()
      .setColor(action === 'accept' ? config.embedColorSuccess : config.embedColorError)
      .setDescription(t(message.guild.id, action === 'accept' ? 'appeal_accepted' : 'appeal_denied', { id: appealId }))
      .addFields(
        { name: t(message.guild.id, 'appeal_user'), value: `<@${appeal.userId}>`, inline: true },
        { name: t(message.guild.id, 'appeal_case'), value: `#${appeal.caseId}`, inline: true },
        { name: t(message.guild.id, 'appeal_admin'), value: `${message.member}`, inline: true },
      )
      .setTimestamp();

    if (note) embed.addFields({ name: t(message.guild.id, 'appeal_admin_note'), value: note });

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });

    if (action === 'accept') {
      const caseEntry = db.getCase(message.guild.id, appeal.caseId);
      if (caseEntry) {
        if (caseEntry.type === 'ban') {
          try { await message.guild.members.unban(appeal.userId, `Appeal #${appealId} accepted`); } catch {}
        } else if (caseEntry.type === 'mute') {
          try {
            const member = await message.guild.members.fetch(appeal.userId);
            if (member) await member.timeout(null, `Appeal #${appealId} accepted`);
          } catch {}
        }
      }
    }

    const logEmbed = buildLogEmbed(message.guild.id, `${t(message.guild.id, 'log_appeal')} - #${appealId}`, [
      { name: t(message.guild.id, 'appeal_user'), value: `<@${appeal.userId}>`, inline: true },
      { name: t(message.guild.id, 'appeal_admin'), value: `${message.member}`, inline: true },
      { name: t(message.guild.id, 'appeal_log_status'), value: status, inline: true },
      ...(note ? [{ name: t(message.guild.id, 'appeal_log_note'), value: note }] : []),
    ], action === 'accept' ? config.embedColorSuccess : config.embedColorError);
    await logToChannel(message.guild.id, message.client, logEmbed);
  },
};
