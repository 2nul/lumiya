const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { t } = require('../../languages');
const { buildCtx, reply, errorEmbed, embed, getPlayer } = require('../../music/commandUtils');

module.exports = {
  name: 'volume',
  description: 'Set or view the music volume',
  usage: ';volume <1-100>',
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set or view the music volume')
    .addIntegerOption(opt => opt.setName('level').setDescription('Volume level (1-100)').setRequired(false).setMinValue(1).setMaxValue(100)),
  async execute(message, args, client) {
    return this.fromArgs(buildCtx(message, args), client);
  },
  async executeSlash(interaction, client) {
    const ctx = buildCtx(interaction, client);
    const level = interaction.options.getInteger('level');
    return this.fromArgs(ctx, client, level);
  },
  async fromArgs(ctx, client, slashLevel) {
    const guildId = ctx.guildId;
    const player = getPlayer(client, guildId);
    const volume = slashLevel !== undefined ? slashLevel : parseInt(ctx.args[0], 10);

    if (!volume || isNaN(volume) || volume < 1 || volume > 100) {
      return reply(ctx, errorEmbed(guildId, 'music_volume_invalid'));
    }

    player.setVolume(volume);
    if (client.musicEmbedManager) {
      await client.musicEmbedManager.updateNowPlayingEmbed(player).catch(() => {});
    }
    return reply(ctx, embed(guildId, config.embedColorInfo, t(guildId, 'music_volume_set', { volume })));
  },
};