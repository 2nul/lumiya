const db = require('./database');
const config = require('./config');
const { t } = require('./languages');
const { createCase, logToChannel, buildCaseEmbed } = require('./cases');

const userMessages = new Map();

function checkSpam(guildId, userId) {
  const key = `${guildId}:${userId}`;
  if (!userMessages.has(key)) userMessages.set(key, []);
  const msgs = userMessages.get(key);
  msgs.push(Date.now());
  const cutoff = Date.now() - config.automod.spamTimeframe;
  while (msgs.length > 0 && msgs[0] < cutoff) msgs.shift();
  return msgs.length > config.automod.spamThreshold;
}

function checkFlood(content) {
  return content.length > config.automod.floodLength;
}

function checkMention(message) {
  const mentions = message.mentions.users.size;
  return mentions > config.automod.mentionThreshold;
}

function checkLink(content, guildId) {
  const linkRegex = /https?:\/\/[^\s]+/gi;
  const links = content.match(linkRegex);
  if (!links) return false;
  for (const link of links) {
    const domain = new URL(link).hostname.replace('www.', '');
    const isWhitelisted = config.automod.linkWhitelist.some(w => domain.includes(w));
    if (!isWhitelisted) return true;
  }
  return false;
}

async function handleViolation(message, type, client) {
  const guildId = message.guild.id;
  const userId = message.author.id;
  const maxWarns = parseInt(db.getSetting(guildId, 'maxWarns')) || config.defaultMaxWarns;
  const warnCount = db.getActiveWarns(guildId, userId).length;

  const caseEntry = createCase(guildId, userId, client.user.id, 'automod', t(guildId, `automod_log_${type}`, { user: message.author.username, count: message.mentions?.users?.size || '?', time: config.automod.spamTimeframe / 1000, length: message.content.length }), null);
  db.addWarn(guildId, userId, caseEntry.id);

  try { await message.delete(); } catch {}

  const caseEmbed = buildCaseEmbed(guildId, caseEntry);

  if (message.channel && message.channel.send) {
    await message.channel.send({ embeds: [caseEmbed] }).catch(() => {});
  }

  await logToChannel(guildId, client, caseEmbed);

  const newWarnCount = warnCount + 1;
  if (newWarnCount >= maxWarns) {
    try {
      const member = await message.guild.members.fetch(userId);
      const action = db.getSetting(guildId, 'automodAction') || 'mute';
      if (action === 'ban') {
        await member.ban({ reason: t(guildId, 'max_warn_action', { max: maxWarns, action: t(guildId, 'auto_ban') }) });
      } else if (action === 'kick') {
        await member.kick(t(guildId, 'max_warn_action', { max: maxWarns, action: t(guildId, 'auto_kick') }));
      } else {
        await member.timeout(10 * 60 * 1000, t(guildId, 'max_warn_action', { max: maxWarns, action: t(guildId, 'auto_mute') }));
      }
    } catch {}
  }

  return true;
}

async function handleMessage(message, client) {
  if (message.author.bot) return;
  if (!message.guild) return;
  const guildId = message.guild.id;
  const automodEnabled = db.getSetting(guildId, 'automod');
  if (automodEnabled === 'false' || automodEnabled === false) return;

  if (checkSpam(guildId, message.author.id)) {
    return handleViolation(message, 'spam', client);
  }
  if (checkFlood(message.content)) {
    return handleViolation(message, 'flood', client);
  }
  if (checkMention(message)) {
    return handleViolation(message, 'mention', client);
  }
  if (checkLink(message.content, guildId)) {
    return handleViolation(message, 'link', client);
  }
  return false;
}

module.exports = { handleMessage };
