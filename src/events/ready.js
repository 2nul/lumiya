const { Events, ActivityType } = require('discord.js');
const config = require('../config');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`$LumiyaBot: Logged in as ${client.user.tag}`);
    client.user.setActivity(`asato | ${config.prefix}help`, { type: ActivityType.Watching });
    console.log(`$LumiyaBot: Serving ${client.guilds.cache.size} guilds`);
    console.log(`$LumiyaBot: ${client.commands.size} commands loaded`);
  },
};
