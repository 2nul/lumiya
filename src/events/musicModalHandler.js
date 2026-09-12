const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');
const LanguageManager = require('../music/LanguageManager');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isModalSubmit() && !interaction.isStringSelectMenu()) return;

        const client = interaction.client;
        const guild = interaction.guild;
        const member = interaction.member;

        try {
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('autoplay_genre:')) {
                    await this.handleAutoplayGenre(interaction, client);
                    return;
                }
            }

            switch (interaction.customId) {
                case 'volume_modal':
                    await this.handleVolumeModal(interaction, client);
                    break;

                case 'lyrics_prev':
                case 'lyrics_next':
                    break;

                default:
                    await interaction.reply({
                        content: await LanguageManager.getTranslation(guild?.id, 'modalhandler.unknown_modal'),
                        ephemeral: true
                    });
            }
        } catch (error) {
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: await LanguageManager.getTranslation(guild?.id, 'modalhandler.processing_error'),
                        ephemeral: true
                    });
                } catch (replyError) {
                }
            }
        }
    },

    async handleAutoplayGenre(interaction, client) {
        const guild = interaction.guild;
        const member = interaction.member;

        if (!member.voice.channel) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(guild?.id, 'modalhandler.voice_channel_required'),
                flags: [1 << 6]
            });
        }

        const player = client.players.get(guild.id);
        if (!player) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(guild?.id, 'modalhandler.no_music_playing'),
                flags: [1 << 6]
            });
        }

        if (player.voiceChannel.id !== member.voice.channel.id) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(guild?.id, 'modalhandler.different_voice_channel'),
                flags: [1 << 6]
            });
        }

        const selectedGenre = interaction.values[0];

        player.autoplay = selectedGenre;

        const genreName = await LanguageManager.getTranslation(guild?.id, `genres.${selectedGenre}`);
        const embed = new EmbedBuilder()
            .setTitle('🎲 ' + await LanguageManager.getTranslation(guild?.id, 'buttonhandler.autoplay_enabled'))
            .setDescription(
                (await LanguageManager.getTranslation(guild?.id, 'buttonhandler.autoplay_enabled_desc'))
                    .replace('{genre}', genreName)
            )
            .setColor(config.bot.embedColor)
            .setTimestamp()
            .addFields({
                name: await LanguageManager.getTranslation(guild?.id, 'buttonhandler.changed_by'),
                value: `${member}`,
                inline: true
            });

        await interaction.reply({ embeds: [embed], flags: [1 << 6] });

        if (client.musicEmbedManager) {
            await client.musicEmbedManager.updateNowPlayingEmbed(player);
        }
    },

    async handleVolumeModal(interaction, client) {
        const guild = interaction.guild;
        const member = interaction.member;

        if (!member.voice.channel) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(guild?.id, 'modalhandler.voice_channel_required'),
                ephemeral: true
            });
        }

        const player = client.players.get(guild.id);
        if (!player) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(guild?.id, 'modalhandler.no_music_playing'),
                ephemeral: true
            });
        }

        if (player.voiceChannel.id !== member.voice.channel.id) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(guild?.id, 'modalhandler.same_channel_required'),
                ephemeral: true
            });
        }

        const volumeInput = interaction.fields.getTextInputValue('volume_input');
        const volume = parseInt(volumeInput);

        if (isNaN(volume) || volume < 0 || volume > 100) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(guild?.id, 'modalhandler.invalid_volume'),
                ephemeral: true
            });
        }

        const success = player.setVolume(volume);

        if (success) {
            const embed = new EmbedBuilder()
                .setTitle(await LanguageManager.getTranslation(guild?.id, 'modalhandler.volume_changed_title'))
                .setDescription(await LanguageManager.getTranslation(guild?.id, 'modalhandler.volume_changed_desc', { volume }))
                .setColor(config.bot.embedColor)
                .setTimestamp()
                .addFields({
                    name: await LanguageManager.getTranslation(guild?.id, 'modalhandler.set_by'),
                    value: `${member}`,
                    inline: true
                });

            const volumeBar = this.createVolumeBar(volume);
            embed.addFields({
                name: await LanguageManager.getTranslation(guild?.id, 'modalhandler.level'),
                value: volumeBar,
                inline: false
            });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
            await interaction.reply({
                content: await LanguageManager.getTranslation(guild?.id, 'modalhandler.volume_error'),
                ephemeral: true
            });
        }
    },

    createVolumeBar(volume) {
        const barLength = 20;
        const filledBars = Math.floor((volume / 100) * barLength);
        const emptyBars = barLength - filledBars;

        const bar = '▓'.repeat(filledBars) + '░'.repeat(emptyBars);
        return `\`${bar}\` ${volume}%`;
    }
};