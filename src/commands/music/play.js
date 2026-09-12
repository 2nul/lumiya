const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');
const { t } = require('../../languages');
const {
  buildCtx, reply, errorEmbed, ensurePlayer, deferIfNeeded, editContent,
} = require('../../music/commandUtils');

module.exports = {
  name: 'play',
  description: 'Mở nhạc từ YouTube',
  usage: ';play <query>',
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play music from YouTube')
    .addStringOption(opt => opt.setName('query').setDescription('Song name or YouTube URL').setRequired(true)),
  async execute(message, args, client) {
    return this.handlePlay(buildCtx(message, args), client);
  },
  async executeSlash(interaction, client) {
    return this.handlePlay(buildCtx(interaction), client);
  },
  async handlePlay(ctx, client) {
    const guildId = ctx.guildId;
    const query = ctx.args.join(' ');
    if (!query) {
      return reply(ctx, t(guildId, 'usage') + ` \`${config.prefix}play <query>\``, { ephemeral: true });
    }

    const voiceChannel = ctx.voiceChannel;
    if (!voiceChannel) {
      return reply(ctx, errorEmbed(guildId, 'music_not_in_voice'));
    }

    const permissions = voiceChannel.permissionsFor(client.user);
    if (!permissions || !permissions.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
      return reply(ctx, errorEmbed(guildId, 'music_bot_lacks_permissions'));
    }

    const botVoice = client.guilds.cache.get(guildId)?.members.me?.voice.channel;
    if (botVoice && botVoice.id !== voiceChannel.id) {
      return reply(ctx, errorEmbed(guildId, 'music_user_not_in_channel'));
    }

    await deferIfNeeded(ctx);

    if (!ctx.isMessage) {
      await editContent(ctx, t(guildId, 'music_searching', { query }));
    } else {
      await ctx.message.reply({ content: t(guildId, 'music_searching', { query }), allowedMentions: { repliedUser: false } }).catch(() => {});
    }

    const trackData = await this.resolveTrackData(query, guildId);
    if (!trackData.success) {
      return reply(ctx, errorEmbed(guildId, 'music_no_results', { query }));
    }

    const guild = client.guilds.cache.get(guildId);
    const player = ensurePlayer(client, guild, ctx.channel, voiceChannel);

    if (player.queue.length + trackData.tracks.length > (config.bot.maxQueueSize || 100)) {
      return reply(ctx, errorEmbed(guildId, 'music_queue_full', { max: config.bot.maxQueueSize }));
    }

    if (!client.musicEmbedManager) {
      return reply(ctx, errorEmbed(guildId, 'error'));
    }

    const result = await client.musicEmbedManager.handleMusicData(guildId, trackData, ctx.member, ctx.interaction);

    if (!result.success) {
      return reply(ctx, errorEmbed(guildId, 'error'));
    }
  },

  async resolveTrackData(query, guildId) {
    const YouTube = require('../../music/YouTube');
    const Spotify = require('../../music/Spotify');
    const SoundCloud = require('../../music/SoundCloud');
    const DirectLink = require('../../music/DirectLink');

    try {
      let tracks = [];
      let isPlaylist = false;

      const platform = this.detectPlatform(query);

      switch (platform) {
        case 'youtube':
          if (YouTube.isPlaylist && YouTube.isPlaylist(query)) {
            const playlistData = await YouTube.getPlaylist(query, guildId);
            if (playlistData && playlistData.tracks && playlistData.tracks.length > 0) {
              tracks = playlistData.tracks;
              isPlaylist = true;
            } else {
              tracks = await YouTube.search(query, 1, guildId);
            }
          } else {
            tracks = await YouTube.search(query, 1, guildId);
          }
          break;

        case 'spotify':
          if (Spotify.isSpotifyURL(query)) {
            const spotifyData = await Spotify.getFromURL(query, guildId);
            tracks = spotifyData || [];
            const { type } = Spotify.parseSpotifyURL(query);
            isPlaylist = type === 'playlist' || type === 'album' || type === 'artist';
          } else {
            const spotifyData = await Spotify.search(query, 1, 'track', guildId);
            tracks = spotifyData || [];
          }
          break;

        case 'soundcloud':
          const soundcloudData = await SoundCloud.search(query, 1, guildId);
          tracks = soundcloudData || [];
          break;

        case 'direct':
          const directData = await DirectLink.getInfo(query);
          tracks = directData || [];
          break;

        default:
          tracks = await YouTube.search(query, 1, guildId);
      }

      if (!tracks || tracks.length === 0) {
        return { success: false, message: 'no_results' };
      }

      return { success: true, isPlaylist, tracks };
    } catch (error) {
      console.error('$LumiyaBot: resolveTrackData error:', error);
      return { success: false, message: String(error && error.message || error) };
    }
  },

  detectPlatform(query) {
    if (query.includes('youtube.com') || query.includes('youtu.be')) {
      return 'youtube';
    } else if (query.includes('spotify.com')) {
      return 'spotify';
    } else if (query.includes('soundcloud.com')) {
      return 'soundcloud';
    } else if (query.startsWith('http') && (query.includes('.mp3') || query.includes('.wav') || query.includes('.ogg'))) {
      return 'direct';
    } else {
      return 'youtube';
    }
  },
};