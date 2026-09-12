const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { t } = require('../../languages');
const { buildCtx, reply, errorEmbed, embed, getPlayer } = require('../../music/commandUtils');

module.exports = {
  name: 'shuffle',
  description: 'Toggle shuffle for the queue',
  usage: ';shuffle',
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Toggle shuffle for the queue'),
  async execute(message, args, client) {
    return this.handleShuffle(buildCtx(message, args), client);
  },
  async executeSlash(interaction, client) {
    return this.handleShuffle(buildCtx(interaction), client);
  },
  async handleShuffle(ctx, client) {
    const guildId = ctx.guildId;
    const player = getPlayer(client, guildId);
    if (!player) {
      return reply(ctx, errorEmbed(guildId, 'music_bot_no_voice'));
    }

    if (player.queue.length < 2) {
      return reply(ctx, errorEmbed(guildId, 'music_shuffle_min'));
    }

    const enabled = !player.shuffle;
    player.setShuffle(enabled);
    if (enabled) {
      player.shuffleQueue();
    }
    if (client.musicEmbedManager) {
      await client.musicEmbedManager.updateNowPlayingEmbed(player).catch(() => {});
    }
    const key = enabled ? 'music_shuffle_enabled' : 'music_shuffle_disabled';
    const color = enabled ? config.embedColorSuccess : config.embedColorWarn;
    return reply(ctx, embed(guildId, color, t(guildId, key)));
  },
};