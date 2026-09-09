const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('./database');
const config = require('./config');
const { t } = require('./languages');
const { logToChannel, buildLogEmbed } = require('./cases');
const { isAdmin } = require('./permissions');

function isTicketChannel(channel) {
  return channel && channel.type === ChannelType.GuildText && channel.name.startsWith('ticket-');
}

function canManageTicket(channel, member) {
  if (isAdmin(channel.guild, member)) return true;
  const supportRole = db.getSetting(channel.guild.id, 'ticketSupportRole');
  if (supportRole && member.roles && member.roles.cache && member.roles.cache.has(supportRole)) return true;
  const ownerKey = member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return channel.name === `ticket-${ownerKey}` || channel.name.startsWith(`ticket-${ownerKey}-`);
}

async function createTicket(guild, user, reason, client) {
  const categoryId = db.getSetting(guild.id, 'ticketCategory');
  const supportRole = db.getSetting(guild.id, 'ticketSupportRole');

  const base = user.username.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const existing = guild.channels.cache.find(c => isTicketChannel(c) && (c.name === `ticket-${base}` || c.name.startsWith(`ticket-${base}-`)));
  if (existing) {
    const err = new Error('already_open');
    err.alreadyOpen = existing;
    throw err;
  }

  let name = `ticket-${base}`;
  let counter = 2;
  while (guild.channels.cache.some(c => c.name === name)) {
    name = `ticket-${base}-${counter++}`;
  }

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
  ];
  if (supportRole) {
    overwrites.push({ id: supportRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  }

  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: categoryId || undefined,
    permissionOverwrites: overwrites,
  });

  const desc = reason ? `${t(guild.id, 'ticket_desc_reason', { user: user.toString(), reason })}\n\n${t(guild.id, 'ticket_close_hint')}` : `${t(guild.id, 'ticket_desc_noreason', { user: user.toString() })}\n\n${t(guild.id, 'ticket_close_hint')}`;

  const embed = new EmbedBuilder()
    .setColor(config.embedColorInfo)
    .setTitle(t(guild.id, 'ticket_welcome_title'))
    .setDescription(desc)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel(t(guild.id, 'ticket_close_btn')).setEmoji('🔒').setStyle(ButtonStyle.Danger),
  );

  await channel.send({ content: `<@${user.id}>`, embeds: [embed], components: [row] });

  const logEmbed = buildLogEmbed(guild.id, `🎫 ${t(guild.id, 'ticket_log_open')}`, [
    { name: t(guild.id, 'ticket_log_user'), value: user.toString(), inline: true },
    { name: t(guild.id, 'ticket_log_channel'), value: `${channel}`, inline: true },
    ...(reason ? [{ name: t(guild.id, 'ticket_log_reason'), value: reason }] : []),
  ], config.embedColorSuccess);
  await logToChannel(guild.id, client, logEmbed);

  return channel;
}

async function closeTicket(channel, member, reason) {
  const guildId = channel.guild.id;
  const embed = new EmbedBuilder()
    .setColor(config.embedColorWarn)
    .setTitle(t(guildId, 'ticket_closing'))
    .addFields(
      { name: t(guildId, 'ticket_log_user'), value: channel.name, inline: true },
      { name: t(guildId, 'ticket_log_closed_by'), value: member.toString(), inline: true },
      ...(reason ? [{ name: t(guildId, 'ticket_log_reason'), value: reason }] : []),
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });

  const logEmbed = buildLogEmbed(guildId, `🎫 ${t(guildId, 'ticket_log_closed')}`, [
    { name: t(guildId, 'ticket_log_user'), value: channel.name, inline: true },
    { name: t(guildId, 'ticket_log_closed_by'), value: member.toString(), inline: true },
    ...(reason ? [{ name: t(guildId, 'ticket_log_reason'), value: reason }] : []),
  ], config.embedColorWarn);
  await logToChannel(guildId, member.client || channel.client, logEmbed);

  return channel;
}

module.exports = { isTicketChannel, canManageTicket, createTicket, closeTicket };