const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { t } = require('../../languages');
const { buildCtx, reply, errorEmbed, embed, getPlayer } = require('../../music/commandUtils');

module.exports = {
  name: 'resume',
  description: 'Resume the current track',
  usage: ';resume',
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the current track'),
  async execute(message, args, client) {
    return this.handleResume(buildCtx(message, args), client);
  },
  async executeSlash(interaction, client) {
    return this.handleResume(buildCtx(interaction), client);
  },
  async handleResume(ctx, client) {
    const guildId = ctx.guildId;
    const player = getPlayer(client, guildId);
    if (!player || !player.currentTrack) {
      return reply(ctx, errorEmbed(guildId, 'music_not_available'));
    }

    if (!player.paused) {
      return reply(ctx, embed(guildId, config.embedColorWarn, t(guildId, 'music_resumed')));
    }

    player.resume();
    if (client.musicEmbedManager) {
      await client.musicEmbedManager.updateNowPlayingEmbed(player).catch(() => {});
    }
    return reply(ctx, embed(guildId, config.embedColorSuccess, t(guildId, 'music_resumed')));
  },
};