const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { t } = require('../languages');

module.exports = {
  name: 'serverinfo',
  description: 'Xem thông tin server',
  usage: ';serverinfo',
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('View server information'),
  async execute(message) {
    const guild = message.guild;
    const guildId = guild.id;

    const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
    const categories = guild.channels.cache.filter(c => c.type === 4).size;
    const onlineMembers = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;

    const verificationLevels = { 0: 'Không có', 1: 'Thấp', 2: 'Trung bình', 3: 'Cao', 4: 'Rất cao' };

    const embed = new EmbedBuilder()
      .setColor(config.embedColorInfo)
      .setTitle(`${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: 'ID', value: guild.id, inline: true },
        { name: 'Chủ sở hữu', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Ngày tạo', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Thành viên', value: `${guild.memberCount}`, inline: true },
        { name: 'Đang trực tuyến', value: `${onlineMembers}`, inline: true },
        { name: 'Boost', value: `${guild.premiumSubscriptionCount || 0} (Level ${guild.premiumTier})`, inline: true },
        { name: 'Kênh', value: `Text: ${textChannels} | Voice: ${voiceChannels} | Danh mục: ${categories}`, inline: false },
        { name: 'Emoji', value: `${guild.emojis.cache.size}`, inline: true },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Mức xác minh', value: verificationLevels[guild.verificationLevel] || 'N/A', inline: true },
      )
      .setTimestamp()
      .setFooter({ text: `Yêu cầu bởi ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

    if (guild.bannerURL()) embed.setImage(guild.bannerURL({ size: 512 }));

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
