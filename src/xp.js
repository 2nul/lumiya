const { EmbedBuilder } = require('discord.js');
const db = require('./database');
const config = require('./config');
const { t } = require('./languages');

const cooldowns = new Map();

function canGainXP(userId) {
  const last = cooldowns.get(userId);
  if (last && Date.now() - last < config.xpCooldown) return false;
  cooldowns.set(userId, Date.now());
  return true;
}

function addXP(guildId, userId) {
  if (!canGainXP(userId)) return null;
  const amount = Math.floor(Math.random() * (config.xpPerMessage.max - config.xpPerMessage.min + 1)) + config.xpPerMessage.min;
  const result = db.addXP(guildId, userId, amount);
  return result;
}

function getXPNeeded(level) {
  return db.getXPNeeded(level);
}

function formatNum(n) {
  const num = Number(n) || 0;
  if (!Number.isFinite(num)) return '0';
  if (num >= 1e15) {
    return num.toLocaleString('en-US');
  }
  return num.toLocaleString();
}

function buildProfileEmbed(guildId, member) {
  const data = db.getOrCreateXP(guildId, member.id);
  const rank = db.getRank(guildId, member.id);
  const xpNeeded = getXPNeeded(data.level);
  const progress = Math.min(Math.floor((data.xp / xpNeeded) * 10), 10);
  const bar = '█'.repeat(progress) + '░'.repeat(10 - progress);

  const streak = data.streak || 0;
  const achievements = [];
  if (data.messages >= 1) achievements.push('💬 ' + t(guildId, 'achievement_first_message'));
  if (streak >= 7) achievements.push('🔥 ' + t(guildId, 'achievement_active_week'));
  if (data.messages >= 100) achievements.push('🦋 ' + t(guildId, 'achievement_social'));
  if (data.level >= 10) achievements.push('🎖️ ' + t(guildId, 'achievement_veteran'));

  const embed = new EmbedBuilder()
    .setColor(config.embedColorXP)
    .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: '📊 ' + t(guildId, 'profile_level'), value: `\`${formatNum(data.level)}\``, inline: true },
      { name: '🏆 ' + t(guildId, 'profile_rank'), value: `\`#${rank === 0 ? '—' : formatNum(rank)}\``, inline: true },
      { name: '💬 ' + t(guildId, 'profile_messages'), value: `\`${formatNum(data.messages)}\``, inline: true },
      { name: '🔥 ' + t(guildId, 'profile_streak'), value: `\`${formatNum(streak)} days\``, inline: true },
      { name: '⭐ ' + t(guildId, 'profile_xp'), value: `\`${formatNum(data.xp)} / ${formatNum(xpNeeded)}\``, inline: true },
      { name: t(guildId, 'profile_xp_progress'), value: `${bar}\n\`${formatNum(data.xp)} / ${formatNum(xpNeeded)}\``, inline: false },
    )
    .setFooter({ text: `${guildId ? '' : ''}Lumiya • ${t(guildId, 'profile_rank', { rank: rank === 0 ? '—' : formatNum(rank) })}` })
    .setTimestamp();

  if (achievements.length > 0) {
    embed.addFields({ name: '🏅 ' + t(guildId, 'profile_achievements'), value: achievements.join('\n') });
  }

  return embed;
}

function buildLeaderboardEmbed(guildId, guildName) {
  const lb = db.getLeaderboard(guildId, 10);
  if (lb.length === 0) {
    return new EmbedBuilder()
      .setColor(config.embedColorInfo)
      .setDescription(t(guildId, 'leaderboard_empty'));
  }

  const medals = ['🥇', '🥈', '🥉'];
  const lines = lb.map((entry, i) => {
    const medal = medals[i] || `${i + 1}.`;
    return `${medal} <@${entry.userId}> — Level **${formatNum(entry.level)}** (${formatNum(entry.xp + entry.level * 1000)} XP)`;
  });

  return new EmbedBuilder()
    .setColor(config.embedColorXP)
    .setTitle(`${t(guildId, 'leaderboard_title', { server: guildName })}`)
    .setDescription(lines.join('\n'))
    .setTimestamp();
}

module.exports = { addXP, buildProfileEmbed, buildLeaderboardEmbed, getXPNeeded, formatNum };