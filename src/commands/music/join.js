const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');
const { t } = require('../../languages');
const {
  buildCtx, reply, errorEmbed, embed, ensurePlayer, getPlayer,
} = require('../../music/commandUtils');

module.exports = {
  name: 'join',
  description: 'Join your current voice channel',
  usage: ';join',
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join your current voice channel'),
  async execute(message, args, client) {
    return this.handleJoin(buildCtx(message, args), client);
  },
  async executeSlash(interaction, client) {
    return this.handleJoin(buildCtx(interaction), client);
  },
  async handleJoin(ctx, client) {
    const guildId = ctx.guildId;
    const voiceChannel = ctx.voiceChannel;

    const existing = getPlayer(client, guildId);
    if (existing && existing.connection) {
      return reply(ctx, errorEmbed(guildId, 'music_already_connected'));
    }

    if (!voiceChannel) {
      return reply(ctx, errorEmbed(guildId, 'music_not_in_voice'));
    }

    const permissions = voiceChannel.permissionsFor(client.user);
    if (!permissions || !permissions.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
      return reply(ctx, errorEmbed(guildId, 'music_bot_lacks_permissions'));
    }

    const player = ensurePlayer(client, client.guilds.cache.get(guildId), ctx.channel, voiceChannel);
    try {
      await player.connect();
      return reply(ctx, embed(guildId, config.embedColorSuccess, t(guildId, 'music_joined', { channel: voiceChannel.name })));
    } catch (error) {
      console.error('$LumiyaBot: Error joining voice:', error);
      return reply(ctx, errorEmbed(guildId, 'error'));
    }
  },
};