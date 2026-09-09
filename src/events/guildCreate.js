const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

module.exports = {
  name: Events.GuildCreate,
  once: true,
  async execute(guild, client) {
    console.log(`$LumiyaBot: Joined guild: ${guild.name} (${guild.id})`);

    const tryChannels = [
      guild.systemChannel,
      guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(guild.members.me).has('SendMessages')),
      guild.channels.cache.first(),
    ].filter(Boolean);

    const channel = tryChannels[0];
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(config.embedColorInfo)
      .setTitle('Language selection')
      .setDescription('Please select a language for the bot.\nVui lòng chọn ngôn ngữ cho bot.');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('lang_vi').setLabel('Tiếng Việt').setEmoji('🇻🇳').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('lang_en').setLabel('English').setEmoji('🇬🇧').setStyle(ButtonStyle.Secondary),
    );

    channel.send({ embeds: [embed], components: [row] }).catch(() => {});
  },
};
