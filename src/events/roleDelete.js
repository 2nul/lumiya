const { Events } = require('discord.js');
const antinuke = require('../antinuke');

module.exports = {
  name: Events.GuildRoleDelete,
  async execute(role, client) {
    await antinuke.handleRoleDelete(role, client);
  },
};
