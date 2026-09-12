const { Events, EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const LanguageManager = require('../music/LanguageManager');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const client = interaction.client;
        const guild = interaction.guild;
        const member = interaction.member;

        // Check if user is in a voice channel (for music controls)
        if (!member.voice.channel) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(guild?.id, 'buttonhandler.voice_channel_required'),
                flags: [1 << 6]
            });
        }

        // Get music player
        const player = client.players.get(guild.id);
        if (!player) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(guild?.id, 'buttonhandler.no_music_playing'),
                flags: [1 << 6]
            });
        }

        // Check if user is in the same voice channel as bot
        if (player.voiceChannel.id !== member.voice.channel.id) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(guild?.id, 'buttonhandler.same_channel_required'),
                flags: [1 << 6]
            });
        }

        try {
            // Parse custom ID for authorization and session validation
            const customIdParts = interaction.customId.split(':');
            const [buttonType, requesterId, sessionId] = customIdParts;

            // Session validation for authorized buttons
            if (sessionId && player.sessionId && sessionId !== player.sessionId) {
                return await interaction.reply({
                    content: await LanguageManager.getTranslation(guild?.id, 'buttonhandler.session_invalid'),
                    flags: [1 << 6]
                });
            }

            switch (buttonType) {
                case 'music_pause':
                    await this.handlePause(interaction, player, requesterId);
                    break;

                case 'music_skip':
                    await this.handleSkip(interaction, player, requesterId);
                    break;

                case 'music_stop':
                    await this.handleStop(interaction, player, client, requesterId);
                    break;

                case 'music_queue':
                    await this.handleQueue(interaction, player);
                    break;

                case 'music_shuffle':
                    await this.handleShuffle(interaction, player, requesterId);
                    break;

                case 'music_volume':
                    await this.handleVolumeModal(interaction, player, requesterId);
                    break;

                case 'music_loop':
                    await this.handleLoop(interaction, player, requesterId);
                    break;

                case 'music_autoplay':
                    await this.handleAutoplay(interaction, player, requesterId);
                    break;

                case 'music_lyrics':
                    await this.handleLyrics(interaction, player);
                    break;

                default:
                    await interaction.reply({
                        content: await LanguageManager.getTranslation(guild?.id, 'buttonhandler.unknown_interaction'),
                        flags: [1 << 6]
                    });
            }
        } catch (error) {
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: await LanguageManager.getTranslation(guild?.id, 'buttonhandler.processing_error'),
                        flags: [1 << 6]
                    });
                } catch (replyError) {
                }
            }
        }
    },

    isAuthorized(interaction, requesterId) {
        const member = interaction.member;

        if (member.permissions.has('ManageGuild')) return true;

        if (member.roles.cache.some(role => role.name.toLowerCase().includes('dj'))) return true;

        if (member.id === requesterId) return true;

        return false;
    },

    async handlePause(interaction, player, requesterId) {
        if (!this.isAuthorized(interaction, requesterId)) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.not_authorized'),
                flags: [1 << 6]
            });
        }

        if (!player.currentTrack) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.no_song_playing'),
                flags: [1 << 6]
            });
        }

        let result;
        let message;
        let emoji;

        if (player.paused) {
            result = player.resume();
            message = await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.music_resumed');
            emoji = '▶️';
        } else {
            result = player.pause();
            message = await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.music_paused');
            emoji = '⏸️';
        }

        if (result) {
            const actionByLabel = await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.action_by');
            const embed = new EmbedBuilder()
                .setTitle(`${emoji} ${message}`)
                .setDescription(`**[${player.currentTrack.title}](${player.currentTrack.url})** ${message}!`)
                .setColor(config.bot.embedColor)
                .setTimestamp()
                .addFields({
                    name: actionByLabel,
                    value: `${interaction.member}`,
                    inline: true
                });

            if (player.currentTrack.thumbnail) {
                embed.setThumbnail(player.currentTrack.thumbnail);
            }

            await interaction.reply({ embeds: [embed], flags: [1 << 6] });

            if (interaction.client.musicEmbedManager) {
                await interaction.client.musicEmbedManager.updateNowPlayingEmbed(player);
            }
        } else {
            await interaction.reply({
                content: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.operation_failed'),
                flags: [1 << 6]
            });
        }
    },

    async handleSkip(interaction, player, requesterId) {
        if (!this.isAuthorized(interaction, requesterId)) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.not_authorized'),
                flags: [1 << 6]
            });
        }

        if (!player.currentTrack) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.no_song_playing'),
                flags: [1 << 6]
            });
        }

        if (player.queue.length === 0) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.no_songs_to_skip'),
                flags: [1 << 6]
            });
        }

        const currentTrack = player.currentTrack;
        const skipped = player.skip();

        if (skipped) {
            const embed = new EmbedBuilder()
                .setTitle(await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.song_skipped_title'))
                .setDescription(`**[${currentTrack.title}](${currentTrack.url})** ${await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.skipped')}!`)
                .setColor(config.bot.embedColor)
                .setTimestamp()
                .addFields({
                    name: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.skipped_by'),
                    value: `${interaction.member}`,
                    inline: true
                });

            if (player.queue.length > 0) {
                embed.addFields({
                    name: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.next_song'),
                    value: `[${player.queue[0].title}](${player.queue[0].url})`,
                    inline: false
                });
                embed.setFooter({
                    text: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.more_songs_in_queue', { count: player.queue.length })
                });
            } else {
                embed.setFooter({
                    text: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.no_more_songs')
                });
            }

            if (currentTrack.thumbnail) {
                embed.setThumbnail(currentTrack.thumbnail);
            }

            await interaction.reply({ embeds: [embed], flags: [1 << 6] });

            if (interaction.client.musicEmbedManager && player.currentTrack) {
                await interaction.client.musicEmbedManager.updateNowPlayingEmbed(player);
            }
        } else {
            await interaction.reply({
                content: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.song_not_skipped'),
                flags: [1 << 6]
            });
        }
    },

    async handleStop(interaction, player, client, requesterId) {
        if (!this.isAuthorized(interaction, requesterId)) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.not_authorized'),
                flags: [1 << 6]
            });
        }

        const queueLength = player.queue.length;
        const currentTrack = player.currentTrack;

        player.stop();
        client.players.delete(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setTitle(await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.music_stopped_title'))
            .setDescription(`${currentTrack ? `**[${currentTrack.title}](${currentTrack.url})**` : 'Music'} ${await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.stopped')}!`)
            .setColor('#FF0000')
            .setTimestamp()
            .addFields({
                name: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.stopped_by'),
                value: `${interaction.member}`,
                inline: true
            });

        if (queueLength > 0) {
            embed.setFooter({
                text: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.songs_cleared', { count: queueLength })
            });
        }

        await interaction.reply({ embeds: [embed], flags: [1 << 6] });

        if (client.musicEmbedManager) {
            await client.musicEmbedManager.handlePlaybackEnd(player);
        }
    },

    async handleQueue(interaction, player) {
        const queueInfo = player.getQueue();

        if (!queueInfo.current && queueInfo.queue.length === 0) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.no_songs_in_queue'),
                flags: [1 << 6]
            });
        }

        const queueTitle = await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.play_queue_title');
        const embed = new EmbedBuilder()
            .setTitle(queueTitle)
            .setColor(config.bot.embedColor)
            .setTimestamp();

        if (queueInfo.current) {
            const currentTime = player.getCurrentTime ? player.getCurrentTime() : 0;
            const progress = this.createProgressBar(currentTime, queueInfo.current.duration);

            embed.addFields({
                name: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.now_playing'),
                value: `**[${queueInfo.current.title}](${queueInfo.current.url})**\n${progress}`,
                inline: false
            });
        }

        if (queueInfo.queue.length > 0) {
            let queueText = '';
            const tracks = queueInfo.queue.slice(0, 10);
            tracks.forEach((track, index) => {
                queueText += `\`${index + 1}.\` **[${track.title}](${track.url})**\n`;
            });

            if (queueInfo.queue.length > 10) {
                queueText += `\n*${await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.and_more', { count: queueInfo.queue.length - 10 })}*`;
            }

            embed.addFields({
                name: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.upcoming_songs', { count: queueInfo.queue.length }),
                value: queueText,
                inline: false
            });
        }

        embed.setFooter({
            text: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.total_songs', { count: queueInfo.queue.length + (queueInfo.current ? 1 : 0) })
        });

        await interaction.reply({ embeds: [embed], flags: [1 << 6] });
    },

    async handleShuffle(interaction, player, requesterId) {
        if (!this.isAuthorized(interaction, requesterId)) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.not_authorized'),
                flags: [1 << 6]
            });
        }

        if (player.queue.length < 2) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.minimum_songs_shuffle'),
                flags: [1 << 6]
            });
        }

        player.shuffleQueue();

        const shuffleTitle = await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.queue_shuffled_title');
        const shuffleDesc = await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.songs_shuffled', { count: player.queue.length });
        const shuffledByLabel = await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.shuffled_by');

        const embed = new EmbedBuilder()
            .setTitle(shuffleTitle)
            .setDescription(shuffleDesc)
            .setColor(config.bot.embedColor)
            .setTimestamp()
            .addFields({
                name: shuffledByLabel,
                value: `${interaction.member}`,
                inline: true
            });

        if (player.queue.length > 0) {
            const nextTracks = player.queue.slice(0, 3);
            let trackList = '';
            nextTracks.forEach((track, index) => {
                trackList += `${index + 1}. **[${track.title}](${track.url})**\n`;
            });

            const nextSongsLabel = await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.next_songs');
            embed.addFields({
                name: nextSongsLabel,
                value: trackList,
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed], flags: [1 << 6] });

        if (interaction.client.musicEmbedManager) {
            await interaction.client.musicEmbedManager.updateNowPlayingEmbed(player);
        }
    },

    async handleVolumeModal(interaction, player, requesterId) {
        if (!this.isAuthorized(interaction, requesterId)) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.not_authorized'),
                flags: [1 << 6]
            });
        }

        const volumeTitle = await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.set_volume_title');
        const volumeLabel = await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.volume_label');

        const modal = new ModalBuilder()
            .setCustomId('volume_modal')
            .setTitle(volumeTitle);

        const volumeInput = new TextInputBuilder()
            .setCustomId('volume_input')
            .setLabel(volumeLabel)
            .setStyle(TextInputStyle.Short)
            .setMinLength(1)
            .setMaxLength(3)
            .setPlaceholder('50')
            .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(volumeInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
    },

    async handleLoop(interaction, player, requesterId) {
        if (!this.isAuthorized(interaction, requesterId)) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.not_authorized'),
                flags: [1 << 6]
            });
        }

        if (!player.currentTrack) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.no_song_playing'),
                flags: [1 << 6]
            });
        }

        let newLoopMode;
        let modeMessage;
        let modeEmoji;

        if (player.loop === false || player.loop === 'off') {
            newLoopMode = 'track';
            modeMessage = await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.loop_mode_track');
            modeEmoji = '🔂';
        } else if (player.loop === 'track') {
            newLoopMode = 'queue';
            modeMessage = await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.loop_mode_queue');
            modeEmoji = '🔁';
        } else {
            newLoopMode = false;
            modeMessage = await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.loop_mode_off');
            modeEmoji = '➡️';
        }

        player.loop = newLoopMode;

        const loopTitle = await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.loop_mode_changed_title');
        const changedByLabel = await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.changed_by');

        const embed = new EmbedBuilder()
            .setTitle(`${modeEmoji} ${loopTitle}`)
            .setDescription(modeMessage)
            .setColor(config.bot.embedColor)
            .setTimestamp()
            .addFields({
                name: changedByLabel,
                value: `${interaction.member}`,
                inline: true
            });

        if (player.currentTrack && player.currentTrack.thumbnail) {
            embed.setThumbnail(player.currentTrack.thumbnail);
        }

        await interaction.reply({ embeds: [embed], flags: [1 << 6] });

        if (interaction.client.musicEmbedManager) {
            await interaction.client.musicEmbedManager.updateNowPlayingEmbed(player);
        }
    },

    async handleAutoplay(interaction, player, requesterId) {
        const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

        if (!this.isAuthorized(interaction, requesterId)) {
            return await interaction.reply({
                content: await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.not_authorized'),
                flags: [1 << 6]
            });
        }

        if (player.autoplay) {
            player.autoplay = false;

            const embed = new EmbedBuilder()
                .setTitle('🎲 ' + await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.autoplay_disabled'))
                .setDescription(await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.autoplay_disabled_desc'))
                .setColor(config.bot.embedColor)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: [1 << 6] });

            if (interaction.client.musicEmbedManager) {
                await interaction.client.musicEmbedManager.updateNowPlayingEmbed(player);
            }
            return;
        }

        const genreOptions = [
            ['pop', '🎤'], ['rock', '🎸'], ['hiphop', '🎧'], ['electronic', '🎛️'],
            ['jazz', '🎷'], ['classical', '🎻'], ['metal', '🤘'], ['country', '🤠'],
            ['rnb', '💃'], ['indie', '🌿'], ['latin', '💃'], ['kpop', '🇰🇷'],
            ['anime', '🎌'], ['lofi', '🌙'], ['random', '🎲']
        ];

        const select = new StringSelectMenuBuilder()
            .setCustomId(`autoplay_genre:${requesterId}:${player.sessionId}`)
            .setPlaceholder(await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.autoplay_select_genre'))
            .addOptions(genreOptions.map(([value, emoji]) =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(LanguageManager.getTranslation(interaction.guild?.id, `genres.${value}`))
                    .setValue(value)
                    .setEmoji(emoji)
            ));

        const row = new ActionRowBuilder().addComponents(select);

        const embed = new EmbedBuilder()
            .setTitle('🎲 ' + await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.autoplay_select_title'))
            .setDescription(await LanguageManager.getTranslation(interaction.guild?.id, 'buttonhandler.autoplay_select_desc'))
            .setColor(config.bot.embedColor);

        await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: [1 << 6]
        });
    },

    createProgressBar(current, total) {
        if (!total || total === 0) return '0:00 / 0:00';

        const currentSeconds = Math.floor(current / 1000);
        const totalSeconds = Math.floor(total);
        const progress = Math.floor((currentSeconds / totalSeconds) * 20);

        return `${this.formatTime(currentSeconds)} [${'▓'.repeat(progress)}${'░'.repeat(20 - progress)}] ${this.formatTime(totalSeconds)}`;
    },

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    },

    async handleLyrics(interaction, player) {
        const LyricsManager = require('../music/LyricsManager');
        const guildId = interaction.guild?.id;

        try {
            if (!player.currentTrack) {
                return await interaction.reply({
                    content: await LanguageManager.getTranslation(guildId, 'buttonhandler.no_song_playing'),
                    flags: [1 << 6]
                });
            }

            if (!player.hasLyrics || !player.hasLyrics()) {
                const noLyricsMsg = await LanguageManager.getTranslation(guildId, 'buttonhandler.no_lyrics_found') || 'No lyrics found for this song.';
                return await interaction.reply({
                    content: `🎤 ${noLyricsMsg}`,
                    flags: [1 << 6]
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const lyricsData = player.currentLyrics;
            const pages = LyricsManager.formatFullLyrics(lyricsData, 4000);

            if (pages.length === 0) {
                return await interaction.editReply({
                    content: await LanguageManager.getTranslation(guildId, 'buttonhandler.lyrics_unavailable') || 'Lyrics are unavailable.'
                });
            }

            const lyricsTitle = await LanguageManager.getTranslation(guildId, 'buttonhandler.lyrics_title') || 'Song Lyrics';

            if (pages.length === 1) {
                const embed = new EmbedBuilder()
                    .setTitle(`🎤 ${lyricsTitle}`)
                    .setDescription(`**${player.currentTrack.title}**\n${player.currentTrack.artist ? `*by ${player.currentTrack.artist}*\n` : ''}\n${pages[0]}`)
                    .setColor(config.bot.embedColor)
                    .setFooter({ text: `Source: ${lyricsData.source}` })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [embed] });
            }

            let currentPage = 0;

            const createLyricsEmbed = (pageIndex) => {
                return new EmbedBuilder()
                    .setTitle(`🎤 ${lyricsTitle}`)
                    .setDescription(`**${player.currentTrack.title}**\n${player.currentTrack.artist ? `*by ${player.currentTrack.artist}*\n` : ''}\n${pages[pageIndex]}`)
                    .setColor(config.bot.embedColor)
                    .setFooter({ text: `Source: ${lyricsData.source} | Page ${pageIndex + 1}/${pages.length}` })
                    .setTimestamp();
            };

            const createPaginationButtons = (pageIndex) => {
                const prevButton = new ButtonBuilder()
                    .setCustomId('lyrics_prev')
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pageIndex === 0);

                const nextButton = new ButtonBuilder()
                    .setCustomId('lyrics_next')
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(pageIndex === pages.length - 1);
                return new ActionRowBuilder().addComponents(prevButton, nextButton);
            };

            await interaction.editReply({
                embeds: [createLyricsEmbed(currentPage)],
                components: [createPaginationButtons(currentPage)]
            });

            const message = await interaction.fetchReply();

            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 300000
            });

            collector.on('collect', async i => {
                try {
                    if (i.customId === 'lyrics_prev' && currentPage > 0) {
                        currentPage--;
                    } else if (i.customId === 'lyrics_next' && currentPage < pages.length - 1) {
                        currentPage++;
                    }

                    if (!i.deferred && !i.replied) {
                        await i.deferUpdate();
                    }

                    await message.edit({
                        embeds: [createLyricsEmbed(currentPage)],
                        components: [createPaginationButtons(currentPage)]
                    });
                } catch (error) {
                    if (error.code === 10062 || error.code === 10008 || error.code === 40060) {
                        console.log('$LumiyaBot: Interaction expired or unknown, ignoring...');
                    }
                }
            });

            collector.on('end', () => {
                interaction.editReply({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('$LumiyaBot: Lyrics handler error:', error);
            const errorMsg = await LanguageManager.getTranslation(guildId, 'buttonhandler.lyrics_error') || 'Failed to load lyrics.';
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMsg });
            } else {
                await interaction.reply({ content: errorMsg, ephemeral: true });
            }
        }
    }
};