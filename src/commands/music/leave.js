const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { t } = require('../../languages');
const { buildCtx, reply, errorEmbed, embed, getPlayer } = require('../../music/commandUtils');

module.exports = {
  name: 'leave',
  description: 'Leave the voice channel and stop music',
  usage: ';leave',
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Leave the voice channel and stop music'),
  async execute(message, args, client) {
    return this.handleLeave(buildCtx(message, args), client);
  },
  async executeSlash(interaction, client) {
    return this.handleLeave(buildCtx(interaction), client);
  },
  async handleLeave(ctx, client) {
    const guildId = ctx.guildId;
    const player = getPlayer(client, guildId);
    if (!player) {
      return reply(ctx, errorEmbed(guildId, 'music_bot_no_voice'));
    }

    player.stop();
    client.players.delete(guildId);
    return reply(ctx, embed(guildId, config.embedColorInfo, t(guildId, 'music_left')));
  },
};