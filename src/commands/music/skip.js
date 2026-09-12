const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { t } = require('../../languages');
const { buildCtx, reply, errorEmbed, embed, getPlayer } = require('../../music/commandUtils');

module.exports = {
  name: 'skip',
  description: 'Skip to the next track',
  usage: ';skip',
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip to the next track'),
  async execute(message, args, client) {
    return this.handleSkip(buildCtx(message, args), client);
  },
  async executeSlash(interaction, client) {
    return this.handleSkip(buildCtx(interaction), client);
  },
  async handleSkip(ctx, client) {
    const guildId = ctx.guildId;
    const player = getPlayer(client, guildId);
    if (!player || !player.currentTrack) {
      return reply(ctx, errorEmbed(guildId, 'music_not_available'));
    }

    if (player.queue.length === 0) {
      return reply(ctx, errorEmbed(guildId, 'music_queue_empty'));
    }

    player.skip();
    if (client.musicEmbedManager) {
      await client.musicEmbedManager.updateNowPlayingEmbed(player).catch(() => {});
    }
    return reply(ctx, embed(guildId, config.embedColorInfo, t(guildId, 'music_skipped')));
  },
};