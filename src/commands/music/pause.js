const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { t } = require('../../languages');
const { buildCtx, reply, errorEmbed, embed, getPlayer } = require('../../music/commandUtils');

module.exports = {
  name: 'pause',
  description: 'Pause the current track',
  usage: ';pause',
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current track'),
  async execute(message, args, client) {
    return this.handlePause(buildCtx(message, args), client);
  },
  async executeSlash(interaction, client) {
    return this.handlePause(buildCtx(interaction), client);
  },
  async handlePause(ctx, client) {
    const guildId = ctx.guildId;
    const player = getPlayer(client, guildId);
    if (!player || !player.currentTrack) {
      return reply(ctx, errorEmbed(guildId, 'music_not_available'));
    }

    if (player.paused) {
      return reply(ctx, embed(guildId, config.embedColorWarn, t(guildId, 'music_paused')));
    }

    player.pause();
    if (client.musicEmbedManager) {
      await client.musicEmbedManager.updateNowPlayingEmbed(player).catch(() => {});
    }
    return reply(ctx, embed(guildId, config.embedColorInfo, t(guildId, 'music_paused')));
  },
};