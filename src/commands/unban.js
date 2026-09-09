const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { t } = require('../languages');
const { createCase, buildCaseEmbed, logToChannel } = require('../cases');

module.exports = {
  name: 'unban',
  description: 'Unban một người dùng bằng User ID',
  usage: ';unban <userID> [lý do]',
  permissions: [PermissionFlagsBits.BanMembers],
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by ID')
    .addStringOption(opt => opt.setName('userid').setDescription('User ID').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason')),
  async execute(message, args) {
    const userId = args[0];
    if (!userId || isNaN(userId)) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(`${t(message.guild.id, 'usage')} \`${config.prefix}unban <userID> [reason]\``);
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
    try {
      const banList = await message.guild.bans.fetch();
      const bannedUser = banList.get(userId);
      if (!bannedUser) {
        const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'user_not_banned'));
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }
      const reason = args.slice(1).join(' ') || t(message.guild.id, 'no_reason');
      await message.guild.members.unban(userId, reason);
      const caseEntry = createCase(message.guild.id, userId, message.author.id, 'unban', reason, null);
      const embed = buildCaseEmbed(message.guild.id, caseEntry);
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      await logToChannel(message.guild.id, message.client, buildCaseEmbed(message.guild.id, caseEntry));
    } catch {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(message.guild.id, 'unban_error'));
      message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }
  },
  async executeSlash(interaction) {
    const userId = interaction.options.getString('userid');
    if (!userId || isNaN(userId)) {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(interaction.guild.id, 'invalid_usage'));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    try {
      const banList = await interaction.guild.bans.fetch();
      const bannedUser = banList.get(userId);
      if (!bannedUser) {
        const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(interaction.guild.id, 'user_not_banned'));
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const reason = interaction.options.getString('reason') || t(interaction.guild.id, 'no_reason');
      await interaction.guild.members.unban(userId, reason);
      const caseEntry = createCase(interaction.guild.id, userId, interaction.user.id, 'unban', reason, null);
      const embed = buildCaseEmbed(interaction.guild.id, caseEntry);
      await interaction.reply({ embeds: [embed] });
      await logToChannel(interaction.guild.id, interaction.client, buildCaseEmbed(interaction.guild.id, caseEntry));
    } catch {
      const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(interaction.guild.id, 'unban_error'));
      interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
