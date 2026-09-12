const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { t } = require('../../languages');
const { buildCtx, reply, errorEmbed, embed, getPlayer } = require('../../music/commandUtils');

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
  name: 'nowplaying',
  description: 'Show the currently playing track',
  usage: ';nowplaying',
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing track'),
  async execute(message, args, client) {
    return this.handleNowPlaying(buildCtx(message, args), client);
  },
  async executeSlash(interaction, client) {
    return this.handleNowPlaying(buildCtx(interaction), client);
  },
  async handleNowPlaying(ctx, client) {
    const guildId = ctx.guildId;
    const player = getPlayer(client, guildId);
    if (!player || !player.currentTrack) {
      return reply(ctx, errorEmbed(guildId, 'music_not_available'));
    }

    const track = player.currentTrack;
    const currentMs = player.getCurrentTime();
    const totalDur = formatDuration(track.duration || 0);
    const position = formatDuration(Math.floor(currentMs / 1000));

    const e = embed(guildId, config.embedColorInfo, '')
      .setTitle(track.title || 'Unknown')
      .setURL(track.url || null)
      .setThumbnail(track.thumbnail || null)
      .addFields(
        { name: t(guildId, 'music_author'), value: track.author || 'Unknown', inline: true },
        { name: t(guildId, 'music_duration'), value: `\`${position} / ${totalDur}\``, inline: true },
        { name: t(guildId, 'music_requested_by'), value: `<@${player.requesterId || ctx.member?.id || ''}>`, inline: true },
      )
      .setFooter({ text: `${t(guildId, 'music_queue_length', { length: player.getQueue().totalTracks })} • 🔊 ${player.volume}% • ${player.paused ? t(guildId, 'music_paused') : ''}` });

    return reply(ctx, e);
  },
};