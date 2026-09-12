const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { t } = require('../../languages');
const { buildCtx, reply, errorEmbed, embed, getPlayer } = require('../../music/commandUtils');

module.exports = {
  name: 'remove',
  description: 'Remove a track from the queue',
  usage: ';remove <position>',
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a track from the queue')
    .addIntegerOption(opt => opt.setName('position').setDescription('Position in the queue (1-based)').setRequired(true).setMinValue(1)),
  async execute(message, args, client) {
    return this.fromArgs(buildCtx(message, args), client);
  },
  async executeSlash(interaction, client) {
    const ctx = buildCtx(interaction, client);
    return this.fromArgs(ctx, client, interaction.options.getInteger('position'));
  },
  async fromArgs(ctx, client, slashPos) {
    const guildId = ctx.guildId;
    const player = getPlayer(client, guildId);
    if (!player) {
      return reply(ctx, errorEmbed(guildId, 'music_bot_no_voice'));
    }

    const pos = slashPos !== undefined ? slashPos : parseInt(ctx.args[0], 10);
    if (!pos || isNaN(pos) || pos < 1) {
      return reply(ctx, errorEmbed(guildId, 'music_remove_invalid', { count: player.queue.length }));
    }

    const removed = player.removeFromQueue(pos - 1);
    if (!removed) {
      return reply(ctx, errorEmbed(guildId, 'music_remove_invalid', { count: player.queue.length }));
    }

    if (client.musicEmbedManager) {
      await client.musicEmbedManager.updateNowPlayingEmbed(player).catch(() => {});
    }
    return reply(ctx, embed(guildId, config.embedColorSuccess, t(guildId, 'music_removed', { pos })));
  },
};