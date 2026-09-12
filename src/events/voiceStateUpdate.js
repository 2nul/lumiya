const { Events } = require('discord.js');

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState, client) {
    const guild = oldState.guild;
    const player = client.players.get(guild.id);
    if (!player) return;

    const botMember = guild.members.me;
    const botId = botMember?.id ?? client.user.id;
    const involvesBot = oldState.id === botId || newState.id === botId;

    if (involvesBot) {
      const oldChannelId = oldState.channelId;
      const newChannelId = newState.channelId;

      if (oldChannelId && !newChannelId) {
        try {
          const embedManager = client.musicEmbedManager || global.clients?.musicEmbedManager;

          player.pendingEndReason = 'forced-disconnect';
          player.queue = [];
          player.currentTrack = null;

          if (embedManager) {
            await embedManager.handlePlaybackEnd(player);
          } else if (typeof player.showQueueCompleted === 'function') {
            await player.showQueueCompleted();
          }
        } catch (error) {
          console.error('$LumiyaBot: Failed to update playback UI after forced disconnect:', error);
        } finally {
          player.cleanup();
          client.players.delete(guild.id);
        }
        return;
      }

      if (newChannelId && oldChannelId !== newChannelId) {
        if (newState.channel) {
          await player.moveToChannel(newState.channel);
          player.clearInactivityTimer(false);
          if (client.musicEmbedManager) {
            await client.musicEmbedManager.updateNowPlayingEmbed(player);
          }
        }
      }

      const wasMuted = oldState.serverMute || oldState.serverDeaf || oldState.suppress;
      const isMuted = newState.serverMute || newState.serverDeaf || newState.suppress;

      if (!wasMuted && isMuted) {
        const paused = player.pauseFor('mute');
        if (paused && client.musicEmbedManager) {
          await client.musicEmbedManager.updateNowPlayingEmbed(player);
        }
      } else if (wasMuted && !isMuted) {
        const resumed = player.resumeFor('mute');
        if (client.musicEmbedManager && (resumed || !player.pauseReasons.has('mute'))) {
          await client.musicEmbedManager.updateNowPlayingEmbed(player);
        }
      }
    }

    const voiceChannelId = player.voiceChannel?.id;
    if (!voiceChannelId) return;

    if (oldState.channelId === voiceChannelId || newState.channelId === voiceChannelId) {
      const channel = guild.channels.cache.get(voiceChannelId);

      if (!channel) {
        player.cleanup();
        client.players.delete(guild.id);
        return;
      }

      const listeners = channel.members.filter(member => !member.user.bot).size;

      if (listeners === 0) {
        const alreadyPaused = player.pauseReasons.has('alone');
        player.startInactivityTimer();
        if (!alreadyPaused && client.musicEmbedManager && player.currentTrack) {
          await client.musicEmbedManager.updateNowPlayingEmbed(player);
        }
      } else {
        const wasPausedForAlone = player.pauseReasons.has('alone');
        player.clearInactivityTimer(true);
        if (wasPausedForAlone && client.musicEmbedManager && player.currentTrack) {
          await client.musicEmbedManager.updateNowPlayingEmbed(player);
        }
      }
    }
  },
};