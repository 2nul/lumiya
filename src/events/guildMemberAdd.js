const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { t } = require('../languages');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    if (member.user.bot) return;
    const guildId = member.guild.id;

    const autoRoleId = db.getSetting(guildId, 'autoRole');
    if (autoRoleId) {
      try {
        const role = member.guild.roles.cache.get(autoRoleId);
        if (role) await member.roles.add(role);
      } catch {}
    }

    const welcomeChannelId = db.getSetting(guildId, 'welcomeChannel');
    if (!welcomeChannelId) return;

    try {
      const channel = member.guild.channels.cache.get(welcomeChannelId);
      if (!channel) return;

      const customMsg = db.getSetting(guildId, 'welcomeMsg');
      const desc = customMsg
        ? customMsg.replace(/{user}/g, `${member}`).replace(/{server}/g, member.guild.name).replace(/{member_count}/g, member.guild.memberCount)
        : t(guildId, 'welcome_desc', { user: `${member}`, server: member.guild.name, memberCount: member.guild.memberCount });

      const embed = new EmbedBuilder()
        .setColor(config.embedColorSuccess)
        .setTitle(t(guildId, 'welcome_title', { user: member.user.username }))
        .setDescription(desc)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      channel.send({ embeds: [embed] });
    } catch {}
  },
};
