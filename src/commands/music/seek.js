const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { t } = require('../../languages');
const { buildCtx, reply, errorEmbed, embed, getPlayer } = require('../../music/commandUtils');

function parseTime(input) {
  const str = String(input).trim();
  const parts = str.split(':').map(Number);
  if (parts.length === 2 && parts.every(n => !isNaN(n))) {
    return parts[0] * 60 + parts[1];
  }
  const secs = parseInt(str, 10);
  return isNaN(secs) ? null : secs;
}

function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

module.exports = {
  name: 'seek',
  description: 'Seek within the current track',
  usage: ';seek <seconds | mm:ss>',
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Seek within the current track')
    .addStringOption(opt => opt.setName('time').setDescription('Time to seek to (seconds or mm:ss)').setRequired(false)),
  async execute(message, args, client) {
    return this.fromArgs(buildCtx(message, args), client);
  },
  async executeSlash(interaction, client) {
    const ctx = buildCtx(interaction, client);
    return this.fromArgs(ctx, client, interaction.options.getString('time'));
  },
  async fromArgs(ctx, client, slashTime) {
    const guildId = ctx.guildId;
    const player = getPlayer(client, guildId);
    if (!player || !player.currentTrack) {
      return reply(ctx, errorEmbed(guildId, 'music_not_available'));
    }

    const raw = slashTime !== undefined ? slashTime : String(ctx.args[0] || '');
    const seconds = parseTime(raw);
    const duration = player.currentTrack.duration || 0;

    if (seconds === null || seconds < 0 || (duration > 0 && seconds > duration)) {
      return reply(ctx, errorEmbed(guildId, 'music_seek_invalid'));
    }

    try {
      await player.play(null, seconds * 1000);
      return reply(ctx, embed(guildId, config.embedColorInfo, t(guildId, 'music_seek_seeked', { time: formatDuration(seconds) })));
    } catch (error) {
      console.error('$LumiyaBot: Error seeking:', error);
      return reply(ctx, errorEmbed(guildId, 'error'));
    }
  },
};