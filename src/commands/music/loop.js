const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { t } = require('../../languages');
const { buildCtx, reply, errorEmbed, embed, getPlayer } = require('../../music/commandUtils');

const MODES = ['off', 'track', 'queue'];

module.exports = {
  name: 'loop',
  description: 'Set the loop mode (off, track or queue)',
  usage: ';loop <off|track|queue>',
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set the loop mode')
    .addStringOption(opt => opt.setName('mode').setDescription('Loop mode')
      .setRequired(false)
      .addChoices(
        { name: 'Off', value: 'off' },
        { name: 'Track', value: 'track' },
        { name: 'Queue', value: 'queue' },
      )),
  async execute(message, args, client) {
    return this.fromArgs(buildCtx(message, args), client);
  },
  async executeSlash(interaction, client) {
    const ctx = buildCtx(interaction, client);
    return this.fromArgs(ctx, client, interaction.options.getString('mode'));
  },
  async fromArgs(ctx, client, slashMode) {
    const guildId = ctx.guildId;
    const player = getPlayer(client, guildId);
    if (!player) {
      return reply(ctx, errorEmbed(guildId, 'music_bot_no_voice'));
    }

    let mode = slashMode !== undefined ? slashMode : String(ctx.args[0] || '').toLowerCase();
    if (!MODES.includes(mode)) {
      return reply(ctx, errorEmbed(guildId, 'music_loop_invalid'));
    }

    player.setLoop(mode);
    const label = t(guildId, `music_loop_${mode}`);
    if (client.musicEmbedManager) {
      await client.musicEmbedManager.updateNowPlayingEmbed(player).catch(() => {});
    }
    return reply(ctx, embed(guildId, config.embedColorInfo, t(guildId, 'music_loop_mode', { mode: label })));
  },
};