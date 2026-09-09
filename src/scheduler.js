const db = require('./database');
const { t } = require('./languages');
const { createCase, logToChannel, buildCaseEmbed, buildLogEmbed } = require('./cases');
const config = require('./config');

async function checkExpiredActions(client) {
  const expired = db.getExpiredTempActions();
  for (const action of expired) {
    try {
      const guild = client.guilds.cache.get(action.guildId);
      if (!guild) { db.removeTempAction(action.id); continue; }

      if (action.type === 'tempban') {
        await guild.members.unban(action.userId, t(action.guildId, 'temp_expired'));
        const caseEntry = createCase(action.guildId, action.userId, client.user.id, 'unban', t(action.guildId, 'temp_expired'), null);
        const embed = buildCaseEmbed(action.guildId, caseEntry);
        await logToChannel(action.guildId, client, embed);
      }

      if (action.type === 'tempmute') {
        try {
          const member = await guild.members.fetch(action.userId);
          if (member) await member.timeout(null, t(action.guildId, 'temp_expired'));
          const caseEntry = createCase(action.guildId, action.userId, client.user.id, 'unmute', t(action.guildId, 'temp_expired'), null);
          const embed = buildCaseEmbed(action.guildId, caseEntry);
          await logToChannel(action.guildId, client, embed);
        } catch {}
      }

      if (action.type === 'temprole') {
        try {
          const member = await guild.members.fetch(action.userId);
          if (member && action.roleId) {
            await member.roles.remove(action.roleId, t(action.guildId, 'temp_expired'));
          }
          const embed = buildLogEmbed(action.guildId, `⏳ ${t(action.guildId, 'temp_expired')}`, [
            { name: 'User', value: `<@${action.userId}>`, inline: true },
            { name: 'Role', value: `<@&${action.roleId}>`, inline: true },
          ]);
          await logToChannel(action.guildId, client, embed);
        } catch {}
      }

      db.removeTempAction(action.id);
    } catch (err) {
      console.error(`[Scheduler] Error processing expired action ${action.id}:`, err);
      db.removeTempAction(action.id);
    }
  }
}

function startScheduler(client) {
  console.log('$LumiyaBot: Scheduler started! checking every 60s');
  setInterval(() => checkExpiredActions(client), 60000);
}

function parseDuration(str) {
  const match = str.match(/^(\d+)(m|h|d|w)$/);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2];
  const multipliers = { m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return num * (multipliers[unit] || 0);
}

function formatDuration(lang, ms) {
  if (!ms) return 'N/A';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return t(lang, 'duration_minutes', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t(lang, 'duration_hours', { n: h });
  const d = Math.floor(h / 24);
  if (d < 7) return t(lang, 'duration_days', { n: d });
  return t(lang, 'duration_weeks', { n: Math.floor(d / 7) });
}

module.exports = { startScheduler, parseDuration, formatDuration };
