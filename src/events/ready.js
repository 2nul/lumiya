const { Events, ActivityType } = require('discord.js');
const config = require('../config');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`$LumiyaBot: Logged in as ${client.user.tag}!`);
    client.user.setActivity(`asato | ${config.prefix}help`, { type: ActivityType.Watching });
    console.log(`$LumiyaBot: Serving ${client.guilds.cache.size} guilds`);
    console.log(`$LumiyaBot: ${client.commands.size} commands loaded`);

    await new Promise(resolve => setTimeout(resolve, 5000));
    if (typeof client.restoreSessions === 'function') {
      await client.restoreSessions().catch(err => console.error(err));
    }
  },
};