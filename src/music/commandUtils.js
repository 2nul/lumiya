const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { t } = require('../languages');
const MusicPlayer = require('./MusicPlayer');

function embed(guildId, color, description) {
  return new EmbedBuilder().setColor(color).setDescription(description);
}

function errorEmbed(guildId, key, vars) {
  return embed(guildId, config.embedColorError, t(guildId, key, vars));
}

function getPlayer(client, guildId) {
  return client.players.get(guildId) || null;
}

function ensurePlayer(client, guild, textChannel, voiceChannel) {
  let player = client.players.get(guild.id);
  if (!player) {
    player = new MusicPlayer(guild, textChannel, voiceChannel);
    client.players.set(guild.id, player);
  }
  player.voiceChannel = voiceChannel;
  player.textChannel = textChannel;
  return player;
}

function voiceChannelOf(member) {
  return member && member.voice ? member.voice.channel : null;
}

function buildCtx(messageOrInteraction, args = []) {
  const isMessage = !!(messageOrInteraction && messageOrInteraction.content !== undefined);
  if (isMessage) {
    return {
      isMessage: true,
      interaction: null,
      message: messageOrInteraction,
      guildId: messageOrInteraction.guild.id,
      member: messageOrInteraction.member,
      channel: messageOrInteraction.channel,
      args,
      voiceChannel: voiceChannelOf(messageOrInteraction.member),
    };
  }
  return {
    isMessage: false,
    interaction: messageOrInteraction,
    message: null,
    guildId: messageOrInteraction.guild.id,
    member: messageOrInteraction.member,
    channel: messageOrInteraction.channel,
    args,
    voiceChannel: voiceChannelOf(messageOrInteraction.member),
  };
}

async function reply(ctx, e, opts = {}) {
  const { ephemeral = true, content = null } = opts;
  const payload = {};
  if (e instanceof EmbedBuilder) payload.embeds = [e];
  else if (e) payload.content = String(e);
  if (content) payload.content = content;

  if (ctx.isMessage) {
    payload.allowedMentions = { repliedUser: false };
    return ctx.message.reply(payload);
  }

  const interaction = ctx.interaction;
  if (interaction.replied || interaction.deferred) {
    return interaction.editReply(payload);
  }
  if (ephemeral) payload.ephemeral = true;
  return interaction.reply(payload);
}

async function deferIfNeeded(ctx) {
  if (!ctx.isMessage && !ctx.interaction.deferred && !ctx.interaction.replied) {
    await ctx.interaction.deferReply();
  }
}

async function editContent(ctx, content) {
  if (ctx.isMessage) return null;
  return ctx.interaction.editReply({ content });
}

const MUSIC_COMMANDS = new Set([
  'play', 'join', 'leave', 'pause', 'resume', 'skip', 'musicstop',
  'volume', 'loop', 'shuffle', 'remove', 'clear', 'seek', 'queue', 'nowplaying',
]);

function isMusicCommand(name) {
  return MUSIC_COMMANDS.has(String(name || '').toLowerCase());
}

function getMusicChannelId(guildId) {
  if (!guildId) return null;
  const db = require('../database');
  return db.getSetting(guildId, 'musicChannel') || null;
}

function musicChannelBlockEmbed(guildId, channelId) {
  return errorEmbed(guildId, 'music_wrong_channel', { channel: `<#${channelId}>` });
}

module.exports = {
  embed,
  errorEmbed,
  getPlayer,
  ensurePlayer,
  voiceChannelOf,
  buildCtx,
  reply,
  deferIfNeeded,
  editContent,
  isMusicCommand,
  getMusicChannelId,
  musicChannelBlockEmbed,
};