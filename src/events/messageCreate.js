const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { t } = require('../languages');
const { addXP, buildProfileEmbed, formatNum } = require('../xp');
const automod = require('../automod');
const { isAdmin } = require('../permissions');
const { isMusicCommand, getMusicChannelId, musicChannelBlockEmbed } = require('../music/commandUtils');

const commandCooldowns = new Map();

function checkCooldown(userId) {
  const now = Date.now();
  const last = commandCooldowns.get(userId);
  if (last && now - last < config.commandCooldown) return true;
  commandCooldowns.set(userId, now);
  return false;
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const guildId = message.guild.id;

    const automodTriggered = await automod.handleMessage(message, client);
    if (automodTriggered) return;

    const xpResult = addXP(guildId, message.author.id);
    if (xpResult && xpResult.leveledUp) {
      const embed = new EmbedBuilder()
        .setColor(config.embedColorXP)
        .setDescription(`🎉 **Level up!** <@${message.author.id}> đã đạt **Level ${formatNum(xpResult.entry.level)}**!`)
        .setTimestamp();
      message.channel.send({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => {});
    }

    if (!message.content.startsWith(config.prefix)) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(guildId, 'command_not_found'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (command.permissions && !isAdmin(message.guild, message.member)) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(guildId, 'no_permission'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (isMusicCommand(commandName)) {
      const musicChannelId = getMusicChannelId(guildId);
      if (musicChannelId && message.channel.id !== musicChannelId) {
        const embed = musicChannelBlockEmbed(guildId, musicChannelId);
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }
    }

    if (checkCooldown(message.author.id)) return;

    try {
      await command.execute(message, args, client);
    } catch (error) {
      console.error(`$LumiyaBot: Error executing ${commandName}:`, error);
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(guildId, 'error'));
      message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
  },
};
