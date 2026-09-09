const { EmbedBuilder } = require('discord.js');
const db = require('./database');
const config = require('./config');
const { t } = require('./languages');
const { createCase, buildCaseEmbed, logToChannel } = require('./cases');
const { isServerOwner } = require('./permissions');

const recentActions = new Map();

function trackAction(guildId, type, userId) {
  if (!userId) return [];
  const key = `${guildId}:${type}:${userId}`;
  if (!recentActions.has(key)) recentActions.set(key, []);
  const actions = recentActions.get(key);
  actions.push(Date.now());
  const cutoff = Date.now() - 10000;
  while (actions.length > 0 && actions[0] < cutoff) actions.shift();
  return actions;
}

function rateLimitHit(actions, threshold, timeframe) {
  if (actions.length < threshold) return false;
  const recent = actions.slice(-threshold);
  return recent[recent.length - 1] - recent[0] <= timeframe;
}

async function isBannableExecutor(guild, executorId) {
  if (!executorId) return false;
  if (isServerOwner(guild.id, executorId)) return false;
  try {
    const member = await guild.members.fetch(executorId);
    return member && member.bannable;
  } catch {
    return false;
  }
}

async function handleNuke(guild, client, executorId, caseReasonText) {
  const guildId = guild.id;
  const caseEntry = createCase(guildId, executorId, client.user.id, 'antinuke', caseReasonText, null);
  const embed = buildCaseEmbed(guildId, caseEntry);

  await logToChannel(guildId, client, embed);

  if (!isServerOwner(guildId, executorId)) {
    try {
      const member = await guild.members.fetch(executorId);
      if (member && member.bannable) {
        await member.ban({ reason: `Anti-Nuke #${caseEntry.id}: ${caseReasonText}` });
      }
    } catch {}
  }
}

async function handleChannelDelete(channel, client) {
  if (!channel.guild) return;
  const guildId = channel.guild.id;
  const antinukeEnabled = db.getSetting(guildId, 'antinuke');
  if (antinukeEnabled === 'false' || antinukeEnabled === false) return;

  let executorId = null;
  try {
    const logs = await channel.guild.fetchAuditLogs({ type: 4, limit: 1 });
    const entry = logs.entries.first();
    if (entry && entry.executor && !entry.executor.bot) executorId = entry.executor.id;
  } catch {}

  if (!executorId) return;
  const actions = trackAction(guildId, 'channel_delete', executorId);
  if (!rateLimitHit(actions, config.antinuke.channelDeleteThreshold, config.antinuke.channelDeleteTimeframe)) return;

  const reason = t(guildId, 'antinuke_bulk', { count: actions.length, what: 'channel' });
  await handleNuke(channel.guild, client, executorId, reason);
}

async function handleRoleDelete(role, client) {
  if (!role.guild) return;
  const guildId = role.guild.id;
  const antinukeEnabled = db.getSetting(guildId, 'antinuke');
  if (antinukeEnabled === 'false' || antinukeEnabled === false) return;

  let executorId = null;
  try {
    const logs = await role.guild.fetchAuditLogs({ type: 5, limit: 1 });
    const entry = logs.entries.first();
    if (entry && entry.executor && !entry.executor.bot) executorId = entry.executor.id;
  } catch {}

  if (!executorId) return;
  const actions = trackAction(guildId, 'role_delete', executorId);
  if (!rateLimitHit(actions, config.antinuke.roleDeleteThreshold, config.antinuke.roleDeleteTimeframe)) return;

  const reason = t(guildId, 'antinuke_bulk', { count: actions.length, what: 'role' });
  await handleNuke(role.guild, client, executorId, reason);
}

async function handleMessageDelete(message, client) {
  if (!message.guild) return;
  const guildId = message.guild.id;
  const antinukeEnabled = db.getSetting(guildId, 'antinuke');
  if (antinukeEnabled === 'false' || antinukeEnabled === false) return;

  if (!message.guild.members.me.permissions.has('ViewAuditLog')) return;

  let executorId = null;
  try {
    const logs = await message.guild.fetchAuditLogs({ limit: 10 });
    const entry = logs.entries.find(e => (e.action === 72 || e.action === 73) && e.executor && !e.executor.bot && e.createdTimestamp >= Date.now() - 5000);
    if (entry) executorId = entry.executor.id;
  } catch {}

  if (!executorId) return;
  const actions = trackAction(guildId, 'message_delete', executorId);
  if (!rateLimitHit(actions, config.antinuke.messageDeleteThreshold, config.antinuke.messageDeleteTimeframe)) return;

  const reason = t(guildId, 'antinuke_bulk', { count: actions.length, what: 'message' });
  await handleNuke(message.guild, client, executorId, reason);
}

module.exports = { handleChannelDelete, handleRoleDelete, handleMessageDelete };