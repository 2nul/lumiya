const { Events, EmbedBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member, client) {
    if (member.user.bot) return;
    const guildId = member.guild.id;

    const goodbyeChannelId = db.getSetting(guildId, 'goodbyeChannel');
    if (!goodbyeChannelId) return;

    try {
      const channel = member.guild.channels.cache.get(goodbyeChannelId);
      if (!channel) return;

      const customMsg = db.getSetting(guildId, 'goodbyeMsg');
      const desc = customMsg
        ? customMsg.replace(/{user}/g, `${member.user.tag}`).replace(/{server}/g, member.guild.name).replace(/{member_count}/g, member.guild.memberCount)
        : t(guildId, 'goodbye_desc', { user: `${member.user.tag}`, server: member.guild.name });

      const embed = new EmbedBuilder()
        .setColor(config.embedColorError)
        .setTitle(t(guildId, 'goodbye_title', { user: member.user.username }))
        .setDescription(desc)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      channel.send({ embeds: [embed] });
    } catch {}
  },
};
