const { Events } = require('discord.js');
const antinuke = require('../antinuke');

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel, client) {
    await antinuke.handleChannelDelete(channel, client);
  },
};
