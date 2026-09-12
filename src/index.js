const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const config = require('./config');
const { startScheduler } = require('./scheduler');
const db = require('./database');
const { getCommandFiles } = require('./commandLoader');
const PlayerStateManager = require('./music/PlayerStateManager');
const MusicPlayer = require('./music/MusicPlayer');
const MusicEmbedManager = require('./music/MusicEmbedManager');
const chalk = require('chalk').default || require('chalk');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();
client.players = new Collection();
client.musicEmbedManager = new MusicEmbedManager(client);

if (!global.clients) global.clients = {};
global.clients.musicEmbedManager = client.musicEmbedManager;

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = getCommandFiles(commandsPath);

for (const file of commandFiles) {
  const command = require(file);
  client.commands.set(command.name, command);
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

async function cleanupAudioCache() {
  const cacheDir = path.join(__dirname, 'audio_cache');

  try {
    if (fs.existsSync(cacheDir)) {
      const files = await fsPromises.readdir(cacheDir);
      const protectedFiles = PlayerStateManager.getProtectedCacheFiles();

      let deletedCount = 0;

      for (const file of files) {
        const absolutePath = path.join(cacheDir, file);
        if (protectedFiles.has(path.resolve(absolutePath))) continue;
        try {
          await fsPromises.unlink(absolutePath);
          deletedCount++;
        } catch (err) {
          console.error(chalk.red(`$LumiyaBot: Failed to delete ${file}:`), err.message);
        }
      }
      if (deletedCount > 0) {
        console.log(chalk.cyan(`$LumiyaBot: Cleaned ${deletedCount} stale audio cache file(s)`));
      }
    } else {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  } catch (error) {
    console.error(chalk.red('$LumiyaBot: Failed to cleanup audio cache:'), error.message);
  }
}

async function restoreSavedPlayers() {
  const savedStates = PlayerStateManager.getAllStates();
  const entries = Object.entries(savedStates || {});
  if (entries.length === 0) return;

  console.log(chalk.cyan(`$LumiyaBot: Found ${entries.length} saved music session(s) to restore...`));

  for (const [guildId, state] of entries) {
    try {
      let guild = client.guilds.cache.get(guildId);

      if (!guild) {
        let retries = 3;
        while (!guild && retries > 0) {
          try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            guild = await client.guilds.fetch(guildId).catch(() => null);
            if (guild) break;
          } catch (error) {
            retries--;
          }
        }
      }

      if (!guild) {
        await PlayerStateManager.removeState(guildId);
        continue;
      }

      const voiceChannelId = state.voiceChannelId;
      const textChannelId = state.textChannelId;

      if (!voiceChannelId || !textChannelId) {
        await PlayerStateManager.removeState(guildId);
        continue;
      }

      let voiceChannel = guild.channels.cache.get(voiceChannelId) || null;
      if (!voiceChannel) voiceChannel = await guild.channels.fetch(voiceChannelId).catch(() => null);

      let textChannel = guild.channels.cache.get(textChannelId) || null;
      if (!textChannel) textChannel = await guild.channels.fetch(textChannelId).catch(() => null);

      const isVoiceValid = voiceChannel && typeof voiceChannel.isVoiceBased === 'function' && voiceChannel.isVoiceBased();
      const isTextValid = textChannel && typeof textChannel.isTextBased === 'function' && textChannel.isTextBased();

      if (!isVoiceValid || !isTextValid) {
        await PlayerStateManager.removeState(guildId);
        continue;
      }

      const player = new MusicPlayer(guild, textChannel, voiceChannel);
      client.players.set(guildId, player);

      try {
        await player.restoreFromState(state);
        console.log(chalk.green(`$LumiyaBot: Successfully restored music session for guild ${guild.name}`));
      } catch (error) {
        console.error(chalk.red(`$LumiyaBot: Failed to restore music session for guild ${guild.name} (${guildId}):`), error.message);
        client.players.delete(guildId);
        player.cleanup();
        await PlayerStateManager.removeState(guildId);
      }
    } catch (error) {
      console.error(chalk.red(`$LumiyaBot: Error during session restore for guild ${guildId}:`), error.message);
      await PlayerStateManager.removeState(guildId);
    }
  }
}

async function gracefulShutdown() {
  const savePromises = [];
  for (const [guildId, player] of client.players) {
    if (player && typeof player.persistState === 'function') {
      savePromises.push(player.persistState('shutdown', true).catch(err => {
        console.error(chalk.red(`$LumiyaBot: Failed to save state for guild ${guildId}:`), err);
      }));
    }
    if (typeof player.stop === 'function') {
      try { player.stop(); } catch (err) {}
    }
    const connection = getVoiceConnection(guildId);
    if (connection) connection.destroy();
  }
  await Promise.all(savePromises);
  await new Promise(resolve => setTimeout(resolve, 1000));
  db.forceSave();
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => gracefulShutdown().then(() => process.exit(0)));
}

if (process.platform === 'win32') {
  const readline = require('readline');
  if (process.stdin.isTTY) {
    readline.createInterface({ input: process.stdin, output: process.stdout }).on('SIGINT', () => {
      gracefulShutdown().then(() => process.exit(0));
    });
  }
}

process.on('unhandledRejection', (reason) => {
  if (reason && reason.code === 10062) return;
  console.error('$LumiyaBot: Unhandled rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('$LumiyaBot: Uncaught exception:', error);
  if (error && (error.code === 10062 || error.code === 40060)) return;
  if (error && error.message && (error.message.includes('terminated') || error.message.includes('ECONNRESET') || error.message.includes('ETIMEDOUT'))) return;
  if (client && client.players) {
    client.players.forEach(player => {
      if (player && typeof player.cleanup === 'function') {
        try { player.cleanup(); } catch (err) {}
      }
    });
    client.players.clear();
  }
  process.exit(1);
});

client.restoreSessions = async function () {
  await restoreSavedPlayers();
  await cleanupAudioCache();
  console.log(chalk.green('$LumiyaBot: Music session restore complete'));
};

startScheduler(client);

client.login(config.token);