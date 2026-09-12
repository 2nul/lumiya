const config = require('./config');

function isServerOwner(guildId, userId) {
  if (!config.SERVER_OWNER_ID) return false;
  return String(config.SERVER_OWNER_ID) === String(userId);
}

function isAdminRole(guildId, member) {
  if (!config.ADMIN_ROLE_ID || !member) return false;
  if (!Array.isArray(config.ADMIN_ROLE_ID)) {
    const ids = String(config.ADMIN_ROLE_ID).split(',').map(s => s.trim()).filter(Boolean);
    for (const id of ids) {
      if (member.roles && member.roles.cache && member.roles.cache.has(id)) return true;
    }
    return false;
  }
  return config.ADMIN_ROLE_ID.some(id => member.roles && member.roles.cache && member.roles.cache.has(id));
}

function isAdmin(guild, member) {
  if (!member) return false;
  return isServerOwner(guild ? guild.id : member.guild ? member.guild.id : null, member.id) || isAdminRole(guild ? guild.id : member.guild ? member.guild.id : null, member);
}

module.exports = { isServerOwner, isAdminRole, isAdmin };
