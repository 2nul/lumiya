const { Events } = require('discord.js');
const antinuke = require('../antinuke');

module.exports = {
  name: Events.MessageDelete,
  async execute(message, client) {
    await antinuke.handleMessageDelete(message, client);
  },
};
