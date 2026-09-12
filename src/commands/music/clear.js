const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { t } = require('../../languages');
const { buildCtx, reply, errorEmbed, embed, getPlayer } = require('../../music/commandUtils');

module.exports = {
  name: 'clear',
  description: 'Clear the queue',
  usage: ';clear',
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear the queue'),
  async execute(message, args, client) {
    return this.handleClear(buildCtx(message, args), client);
  },
  async executeSlash(interaction, client) {
    return this.handleClear(buildCtx(interaction), client);
  },
  async handleClear(ctx, client) {
    const guildId = ctx.guildId;
    const player = getPlayer(client, guildId);
    if (!player) {
      return reply(ctx, errorEmbed(guildId, 'music_bot_no_voice'));
    }

    if (player.queue.length === 0) {
      return reply(ctx, errorEmbed(guildId, 'music_queue_empty'));
    }

    player.clearQueue();
    if (client.musicEmbedManager) {
      await client.musicEmbedManager.updateNowPlayingEmbed(player).catch(() => {});
    }
    return reply(ctx, embed(guildId, config.embedColorSuccess, t(guildId, 'music_cleared')));
  },
};