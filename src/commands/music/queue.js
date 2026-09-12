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

const MAX_TRACKS = 10;

module.exports = {
  name: 'queue',
  description: 'Show the current queue',
  usage: ';queue',
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current queue'),
  async execute(message, args, client) {
    return this.handleQueue(buildCtx(message, args), client);
  },
  async executeSlash(interaction, client) {
    return this.handleQueue(buildCtx(interaction), client);
  },
  async handleQueue(ctx, client) {
    const guildId = ctx.guildId;
    const player = getPlayer(client, guildId);
    if (!player || !player.currentTrack) {
      return reply(ctx, errorEmbed(guildId, 'music_queue_empty'));
    }

    const data = player.getQueue();
    const e = embed(guildId, config.embedColorInfo, '')
      .setTitle(t(guildId, 'music_queued_title'))
      .setThumbnail(player.currentTrack.thumbnail || null);

    const current = data.current;
    const currentDur = current && current.duration ? formatDuration(current.duration) : '?';
    e.addFields({
      name: t(guildId, 'music_currently_playing'),
      value: `[${current.title}](<${current.url}>) — ${current.author || 'Unknown'} [\`${currentDur}\`]`,
      inline: false,
    });

    const list = data.queue.slice(0, MAX_TRACKS);
    if (list.length > 0) {
      const lines = list.map((track, i) => {
        const dur = formatDuration(track.duration || 0);
        return `\`${i + 1}.\` [${track.title}](<${track.url}>) — \`${dur}\``;
      });
      e.addFields({ name: t(guildId, 'music_queued_tracks'), value: lines.join('\n'), inline: false });
    }

    const extra = data.queue.length - MAX_TRACKS;
    const footer = [];
    footer.push(t(guildId, 'music_queue_length', { length: data.totalTracks }));
    footer.push(`⌛ ${formatDuration(data.duration)}`);
    if (extra > 0) footer.push(t(guildId, 'music_queue_more', { count: extra }));
    e.setFooter({ text: footer.join(' • ') });

    return reply(ctx, e);
  },
};