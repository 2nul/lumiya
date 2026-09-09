const { EmbedBuilder, PermissionFlagsBits, ActivityType, SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { t } = require('../languages');

const activityTypes = {
  playing: ActivityType.Playing,
  streaming: ActivityType.Streaming,
  listening: ActivityType.Listening,
  watching: ActivityType.Watching,
  competing: ActivityType.Competing,
};

module.exports = {
  name: 'editstatus',
  description: 'Chỉnh sửa trạng thái của bot',
  usage: ';editstatus <type> <text> [url]',
  permissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('editstatus')
    .setDescription('Change bot status')
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Activity type')
        .setRequired(true)
        .addChoices(
          { name: 'Playing', value: 'playing' },
          { name: 'Streaming', value: 'streaming' },
          { name: 'Listening', value: 'listening' },
          { name: 'Watching', value: 'watching' },
          { name: 'Competing', value: 'competing' },
        ),
    )
    .addStringOption(opt => opt.setName('text').setDescription('Status text').setRequired(true))
    .addStringOption(opt => opt.setName('url').setDescription('Stream URL (Twitch/YouTube, streaming only)')),
  async execute(message, args) {
    const typeStr = args[0];
    const text = args.slice(1).join(' ');

    if (!typeStr || !activityTypes[typeStr]) {
      const embed = new EmbedBuilder()
        .setColor(config.embedColorError)
        .setDescription(t(message.guild.id, 'editstatus_usage'))
        .addFields(
          { name: '`playing`', value: t(message.guild.id, 'editstatus_type_playing'), inline: true },
          { name: '`streaming`', value: t(message.guild.id, 'editstatus_type_streaming'), inline: true },
          { name: '`listening`', value: t(message.guild.id, 'editstatus_type_listening'), inline: true },
          { name: '`watching`', value: t(message.guild.id, 'editstatus_type_watching'), inline: true },
          { name: '`competing`', value: t(message.guild.id, 'editstatus_type_competing'), inline: true },
        )
        .setFooter({ text: t(message.guild.id, 'editstatus_footer') });
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    if (!text) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'editstatus_no_text'));
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const activityOptions = { type: activityTypes[typeStr] };

    if (typeStr === 'streaming') {
      const url = args.find(a => a.startsWith('http'));
      if (!url) {
        const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'editstatus_streaming_url'));
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }
      activityOptions.url = url;
    }

    message.client.user.setActivity(text, activityOptions);

    const embed = new EmbedBuilder()
      .setColor(config.embedColorSuccess)
      .setDescription(t(message.guild.id, 'editstatus_success', { type: typeStr, text }))
      .setTimestamp();

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
  async executeSlash(interaction) {
    const typeStr = interaction.options.getString('type');
    const text = interaction.options.getString('text');
    const url = interaction.options.getString('url');

    const activityOptions = { type: activityTypes[typeStr] };

    if (typeStr === 'streaming') {
      if (!url) {
        const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(interaction.guild.id, 'editstatus_streaming_url'));
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      activityOptions.url = url;
    }

    interaction.client.user.setActivity(text, activityOptions);

    const embed = new EmbedBuilder()
      .setColor(config.embedColorSuccess)
      .setDescription(t(interaction.guild.id, 'editstatus_success', { type: typeStr, text }))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
