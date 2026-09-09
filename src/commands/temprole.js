const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');
const { buildLogEmbed, logToChannel } = require('../cases');
const { parseDuration } = require('../scheduler');

module.exports = {
  name: 'temprole',
  description: 'Gán role tạm thời cho thành viên',
  usage: ';temprole @user @role <thời gian>',
  permissions: [PermissionFlagsBits.ManageRoles],
  data: new SlashCommandBuilder()
    .setName('temprole')
    .setDescription('Assign a role temporarily')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true))
    .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 1h, 2d, 1w)').setRequired(true)),
  async execute(message, args) {
    const member = message.mentions.members.first();
    if (!member) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'temprole_invalid'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const role = message.mentions.roles.first();
    if (!role) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'temprole_invalid'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const durationStr = args[2];
    const durationMs = parseDuration(durationStr);
    if (!durationMs) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'tempban_invalid_time'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (role.position >= message.guild.members.me.roles.highest.position) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'higher_role'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    await member.roles.add(role);

    db.addTempAction(message.guild.id, member.id, 'temprole', Date.now() + durationMs, { roleId: role.id });

    const embed = buildLogEmbed(message.guild.id, '⏳ Temprole', [
      { name: 'User', value: `${member}`, inline: true },
      { name: 'Role', value: `${role}`, inline: true },
      { name: 'Duration', value: parseDuration(durationStr) ? `${durationStr}` : 'N/A', inline: true },
      { name: 'Moderator', value: `${message.member}`, inline: true },
    ], config.embedColorTemp);

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    await logToChannel(message.guild.id, message.client, embed);
  },
};
