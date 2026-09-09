const { EmbedBuilder } = require('discord.js');
const db = require('./database');
const config = require('./config');
const { t } = require('./languages');

function getEmoji(type) {
  const map = { ban: '🔨', unban: '🔓', kick: '👢', mute: '🔇', unmute: '🔊', warn: '⚠️', tempban: '⏳🔨', purge: '🗑️', lock: '🔒', unlock: '🔓', automod: '🤖', antinuke: '🛡️' };
  return map[type] || '📋';
}

function formatDuration(ms) {
  if (!ms) return null;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function createCase(guildId, userId, moderatorId, type, reason, durationMs) {
  const entry = db.createCase(guildId, userId, moderatorId, type, reason, durationMs);
  return entry;
}

function buildCaseEmbed(guildId, caseEntry) {
  const { id, userId, moderatorId, type, reason, duration, createdAt } = caseEntry;
  const emoji = getEmoji(type);
  const typeName = t(guildId, `type_${type}`) || type;

  const embed = new EmbedBuilder()
    .setColor(config.embedColorInfo)
    .setTitle(`${emoji} ${t(guildId, 'case_title', { id })}`)
    .addFields(
      { name: t(guildId, 'field_user'), value: `<@${userId}>`, inline: true },
      { name: t(guildId, 'field_type'), value: typeName, inline: true },
      { name: t(guildId, 'field_moderator'), value: `<@${moderatorId}>`, inline: true },
      { name: t(guildId, 'field_reason'), value: reason || t(guildId, 'no_reason') },
    )
    .setTimestamp(createdAt);

  if (duration) {
    embed.addFields({ name: t(guildId, 'field_duration'), value: formatDuration(duration) || 'N/A', inline: true });
  }

  const activeWarns = db.getActiveWarns(guildId, userId);
  if (type !== 'warn') {
    embed.addFields({ name: t(guildId, 'field_previous_warnings'), value: `${activeWarns.length}`, inline: true });
  }

  return embed;
}

async function logToChannel(guildId, client, embed) {
  const logChannelId = db.getSetting(guildId, 'logChannel');
  if (!logChannelId) return;
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;
    const channel = guild.channels.cache.get(logChannelId);
    if (!channel) return;
    await channel.send({ embeds: [embed] });
  } catch {}
}

function buildLogEmbed(guildId, title, fields, color) {
  return new EmbedBuilder()
    .setColor(color || config.embedColorInfo)
    .setTitle(title)
    .addFields(fields)
    .setTimestamp();
}

module.exports = { createCase, buildCaseEmbed, logToChannel, buildLogEmbed, formatDuration, getEmoji };
