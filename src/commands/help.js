const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { t } = require('../languages');
const { isAdmin } = require('../permissions');

module.exports = {
  name: 'help',
  description: 'Hiển thị danh sách tất cả lệnh',
  usage: ';help [tên lệnh]',
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands')
    .addStringOption(opt => opt.setName('command').setDescription('Command name to view details')),
  async execute(message, args) {
    const commands = message.client.commands;
    const guildId = message.guild.id;
    const userIsAdmin = isAdmin(message.guild, message.member);

    if (args[0]) {
      const cmd = commands.get(args[0].toLowerCase());
      if (!cmd) {
        const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(guildId, 'command_not_found'));
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }
      if (cmd.permissions && !userIsAdmin) {
        const embed = new EmbedBuilder().setColor(config.embedColorError).setDescription(t(guildId, 'no_permission'));
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }
      const embed = new EmbedBuilder()
        .setColor(config.embedColorInfo)
        .setTitle(`${config.prefix}${cmd.name}`)
        .addFields(
          { name: t(guildId, 'help_desc'), value: cmd.description || 'N/A' },
          { name: t(guildId, 'help_usage'), value: `\`${cmd.usage || config.prefix + cmd.name}\`` },
        )
        .setTimestamp();
      if (cmd.permissions) embed.addFields({ name: t(guildId, 'help_perms'), value: t(guildId, 'help_admin_only') });
      return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    const categories = {
      moderation: ['ban', 'unban', 'kick', 'mute', 'unmute', 'warn', 'warnings', 'delwarn', 'case', 'tempban', 'temprole', 'purge', 'lock', 'unlock'],
      utility: ['userinfo', 'serverinfo', 'help', 'editstatus', 'ticket', 'restart', 'reboot', 'shutdown', 'stop', 'off'],
      settings: ['settings', 'setlog', 'setwelcome', 'setgoodbye', 'setautorole', 'setmaxwarn', 'lang', 'automod', 'antinuke'],
      xp: ['profile', 'leaderboard'],
      appeal: ['appeal', 'appeals', 'resolveappeal'],
      tests: ['testsetxp', 'testresetxp', 'testfakecase'],
    };

    const fields = Object.entries(categories).map(([cat, cmdNames]) => {
      const filtered = cmdNames.filter(n => {
        if (!commands.has(n)) return false;
        const cmd = commands.get(n);
        if (cmd.permissions && !userIsAdmin) return false;
        return true;
      });
      if (filtered.length === 0) return null;
      return {
        name: t(guildId, `help_categories.${cat}`) || cat,
        value: filtered.map(n => {
          const cmd = commands.get(n);
          return `\`${config.prefix}${n}\` - ${cmd.description || ''}`;
        }).join('\n'),
        inline: true,
      };
    }).filter(Boolean);

    const embed = new EmbedBuilder()
      .setColor(config.embedColorInfo)
      .setTitle(t(guildId, 'help_title'))
      .setDescription(`**Prefix:** \`${config.prefix}\``)
      .addFields(fields)
      .setTimestamp()
      .setFooter({ text: t(guildId, 'help_footer', { prefix: config.prefix }) });

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
