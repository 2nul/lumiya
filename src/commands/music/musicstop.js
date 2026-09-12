const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { t } = require('../../languages');
const { buildCtx, reply, errorEmbed, embed, getPlayer } = require('../../music/commandUtils');

module.exports = {
  name: 'musicstop',
  description: 'Stop the music and clear the queue',
  usage: ';musicstop',
  data: new SlashCommandBuilder()
    .setName('musicstop')
    .setDescription('Stop the music and clear the queue'),
  async execute(message, args, client) {
    return this.handleStop(buildCtx(message, args), client);
  },
  async executeSlash(interaction, client) {
    return this.handleStop(buildCtx(interaction), client);
  },
  async handleStop(ctx, client) {
    const guildId = ctx.guildId;
    const player = getPlayer(client, guildId);
    if (!player) {
      return reply(ctx, errorEmbed(guildId, 'music_bot_no_voice'));
    }

    player.stop();
    client.players.delete(guildId);
    if (client.musicEmbedManager) {
      await client.musicEmbedManager.handlePlaybackEnd(player).catch(() => {});
    }
    return reply(ctx, embed(guildId, config.embedColorError, t(guildId, 'music_stopped')));
  },
};