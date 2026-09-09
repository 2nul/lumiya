const config = require('./config');

function isServerOwner(guildId, userId) {
  if (!config.server_owner_id) return false;
  return String(config.server_owner_id) === String(userId);
}

function isAdminRole(guildId, member) {
  if (!config.admin_role_id || !member) return false;
  if (!Array.isArray(config.admin_role_id)) {
    const ids = String(config.admin_role_id).split(',').map(s => s.trim()).filter(Boolean);
    for (const id of ids) {
      if (member.roles && member.roles.cache && member.roles.cache.has(id)) return true;
    }
    return false;
  }
  return config.admin_role_id.some(id => member.roles && member.roles.cache && member.roles.cache.has(id));
}

function isAdmin(guild, member) {
  if (!member) return false;
  return isServerOwner(guild ? guild.id : member.guild ? member.guild.id : null, member.id) || isAdminRole(guild ? guild.id : member.guild ? member.guild.id : null, member);
}

module.exports = { isServerOwner, isAdminRole, isAdmin };
