require('dotenv').config();
const path = require('path');

module.exports = {
  token: process.env.BOT_TOKEN,
  SERVER_OWNER_ID: process.env.SERVER_OWNER_ID,
  ADMIN_ROLE_ID: process.env.ADMIN_ROLE_ID,
  prefix: ';',
  embedColor: 0x2b2d31,
  embedColorError: 0xed4245,
  embedColorSuccess: 0x57f287,
  embedColorInfo: 0x5865f2,
  embedColorWarn: 0xfee75c,
  embedColorTemp: 0xeb459e,
  embedColorXP: 0xf47fff,
  xpPerMessage: { min: 15, max: 25 },
  xpCooldown: 30000,
  maxLevel: 500,
  maxXPPerLevel: 50000,
  defaultMaxWarns: 5,
  commandCooldown: 3000,
  automod: {
    spamThreshold: 5,
    spamTimeframe: 5000,
    floodLength: 500,
    mentionThreshold: 5,
    linkWhitelist: ['youtube.com', 'youtu.be', 'yt.be', 'github.com', 'twitch.tv', 'twitter.com', 'x.com', 'tiktok.com'],
  },
  antinuke: {
    channelDeleteThreshold: 4,
    channelDeleteTimeframe: 1000,
    roleDeleteThreshold: 4,
    roleDeleteTimeframe: 1000,
    messageDeleteThreshold: 5,
    messageDeleteTimeframe: 1000,
  },
  DEFAULT_VOLUME: parseInt(process.env.DEFAULT_VOLUME) || 50,
  MUSIC_IDLE_TIMEOUT: parseInt(process.env.MUSIC_IDLE_TIMEOUT) || 300,
  MUSIC_MAX_QUEUE_SIZE: parseInt(process.env.MUSIC_MAX_QUEUE_SIZE) || 100,

  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
  },

  genius: {
    clientId: process.env.GENIUS_CLIENT_ID || '',
    clientSecret: process.env.GENIUS_CLIENT_SECRET || '',
  },

  bot: {
    defaultVolume: parseInt(process.env.DEFAULT_VOLUME) || 50,
    maxQueueSize: parseInt(process.env.MUSIC_MAX_QUEUE_SIZE) || 100,
    maxPlaylistSize: parseInt(process.env.MUSIC_MAX_QUEUE_SIZE) || 50,
    status: process.env.STATUS || `🎵 Lumiya | ${process.env.prefix || ';'}play`,
    embedColor: process.env.EMBED_COLOR || '#5865f2',
    supportServer: process.env.SUPPORT_SERVER || 'https://discord.gg/',
    website: process.env.WEBSITE || 'https://lumiya.local',
    invite: 'https://discord.com/oauth2/authorize?client_id=' + (process.env.bot_client_id || '') + '&permissions=8&scope=bot%20applications.commands',
  },

  audio: {
    quality: 'highestaudio',
    format: 'mp3',
    bitrate: 320,
    filters: {
      bassboost: 'bass=g=20',
      nightcore: 'aresample=48000,asetrate=48000*1.25',
      vaporwave: 'aresample=48000,asetrate=48000*0.8',
      _8d: 'apulsator=hz=0.09',
    }
  },

  ytdl: {
    requestOptions: {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    },
    format: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
    filter: 'audioonly',
    quality: 'highestaudio',
    highWaterMark: 1 << 25,
    cookiesFromBrowser: process.env.COOKIES_FROM_BROWSER || null,
    cookiesFile: process.env.COOKIES_FILE || null,
    poToken: process.env.YOUTUBE_PO_TOKEN || null,
    ffmpegLocation: path.join(__dirname, '..', 'bin'),
  },
};
