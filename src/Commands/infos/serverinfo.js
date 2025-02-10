const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require("discord.js");
const LunarModel = require("../../database/schema/coins_database.js");
const i18next = require('i18next');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("「🔎」Veja as informações do servidor")
        .setDescriptionLocalizations({
            'en-US': '「🔎」View server information',
            'en-GB': '「🔎」View server information',
        })
        .setDMPermission(false),

    async execute(interaction, client) {
        const verify_lunnar = await LunarModel.findOne({ user_id: interaction.user.id });

        if (!verify_lunnar) await LunarModel.create({ 
            user_id: interaction.user.id, 
            coins: 0, 
            isVip: false, 
            prompts_used: 0, 
            language: 'pt-BR', 
            image_prompts_used: 0 
        });

        const lunnar = await LunarModel.findOne({ user_id: interaction.user.id });
        const userLanguage = lunnar.language;
        
        const guild = interaction.guild;
        const client_guild = guild.members.cache.get(client.user.id);
        const features = await features_calc(guild.features, userLanguage);

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`infoSelect`)
                    .setPlaceholder(i18next.t('serverinfo.select_placeholder', { lng: userLanguage }))
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`${guild.name} - Banner`)
                            .setValue('banner')
                            .setDescription(i18next.t('serverinfo.banner_description', { lng: userLanguage }))
                            .setEmoji('<:gratian_imagem:1105112415038865538>')
                            .setDefault(false),
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`${guild.name} - Icon`)
                            .setValue('icon')
                            .setDescription(i18next.t('serverinfo.icon_description', { lng: userLanguage }))
                            .setEmoji('<:gratian_imagem:1105112415038865538>')
                            .setDefault(false)
                    )
            );

        const embed = new EmbedBuilder()
            .setColor("#be00e8")
            .setTitle(`${guild.name} | ${i18next.t('serverinfo.embed_title', { lng: userLanguage })} <:hypesquadevents:1238705175695196212>`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setDescription(` `)
            .addFields(
                {
                    name: `<:IDD:1052973779153846372> ${i18next.t('serverinfo.guild_id', { lng: userLanguage })}`,
                    value: `${guild.id}`,
                    inline: true
                },
                {
                    name: `<a:staff:1238703736524771491> ${i18next.t('serverinfo.guild_owner', { lng: userLanguage })}`,
                    value: `<@${guild.ownerId}>`,
                    inline: true
                },
                {
                    name: `<a:Boost:1238718692104212532> ${i18next.t('serverinfo.boosts', { lng: userLanguage })}`,
                    value: i18next.t('serverinfo.boost_info', { 
                        count: guild.premiumSubscriptionCount, 
                        level: guild.premiumTier,
                        lng: userLanguage 
                    }),
                    inline: true
                },
                {
                    name: `<:timer:1104785133116080220> ${i18next.t('serverinfo.created_at', { lng: userLanguage })}`,
                    value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:f> \n(<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`,
                    inline: true
                },
                {
                    name: `<:gold_donator:1053256617518440478> ${i18next.t('serverinfo.joined_at', { lng: userLanguage })}`,
                    value: `<t:${Math.floor(client_guild.joinedTimestamp / 1000)}:f> \n(<t:${Math.floor(client_guild.joinedTimestamp / 1000)}:R>)`,
                    inline: true
                },
                {
                    name: `<:bl_info:1053256877896634439> ${i18next.t('serverinfo.info', { lng: userLanguage })}`,
                    value: i18next.t('serverinfo.info_value', {
                        memberCount: guild.memberCount,
                        channelCount: guild.channels.channelCountWithoutThreads,
                        textChannels: guild.channels.cache.filter(channel => channel.type === 0).size,
                        voiceChannels: guild.channels.cache.filter(channel => channel.type === 2).size,
                        lng: userLanguage
                    }),
                    inline: false
                },
                {
                    name: `<:simJEFF:1109206099346862140> ${i18next.t('serverinfo.feature', { lng: userLanguage })}`,
                    value: features.join('\n'),
                    inline: false
                }
            );

        interaction.reply({ content: `${interaction.user}`, embeds: [embed], components: [row] }).then(msg => {
            const collector = msg.channel.createMessageComponentCollector();

            collector.on('collect', async int => {
                if (int.message.id !== msg.id) return;
                if (int.user.id !== interaction.user.id) return int.reply({ 
                    content: i18next.t('serverinfo.not_your_interaction', { lng: userLanguage }), 
                    flags: MessageFlags.Ephemeral 
                });
                
                if (!int.isStringSelectMenu()) return;
                const select = int.values[0];

                if (select === 'banner') {
                    if (!guild.banner) return int.reply({ 
                        content: i18next.t('serverinfo.no_banner', { lng: userLanguage }), 
                        flags: MessageFlags.Ephemeral 
                    });
                    int.reply({ files: [guild.bannerURL({ dynamic: true })] });
                }

                if (select === 'icon') {
                    if (!guild.iconURL({ dynamic: true })) return int.reply({ 
                        content: i18next.t('serverinfo.no_icon', { lng: userLanguage }), 
                        flags: MessageFlags.Ephemeral 
                    });
                    int.reply({ 
                        content: guild.iconURL({ dynamic: true }), 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            });
        });
    }
};

async function features_calc(feature, language) {
    if (!feature) return [`<:naoJEFF:1109179756831854592>`];

    const featuresCalc = {
        ANIMATED_BANNER: i18next.t('serverinfo.features.animated_banner', { lng: language }),
        CHANNEL_ICON_EMOJIS_GENERATED: i18next.t('serverinfo.features.channel_icon_emojis', { lng: language }),
        ANIMATED_ICON: i18next.t('serverinfo.features.animated_icon', { lng: language }),
        APPLICATION_COMMAND_PERMISSIONS_V2: i18next.t('serverinfo.features.app_commands_v2', { lng: language }),
        AUTO_MODERATION: i18next.t('serverinfo.features.auto_moderation', { lng: language }),
        BANNER: i18next.t('serverinfo.features.banner', { lng: language }),
        COMMUNITY: i18next.t('serverinfo.features.community', { lng: language }),
        CREATOR_MONETIZABLE_PROVISIONAL: i18next.t('serverinfo.features.creator_monetization', { lng: language }),
        CREATOR_STORE_PAGE: i18next.t('serverinfo.features.creator_store', { lng: language }),
        DEVELOPER_SUPPORT_SERVER: i18next.t('serverinfo.features.dev_support', { lng: language }),
        DISCOVERABLE: i18next.t('serverinfo.features.discoverable', { lng: language }),
        FEATURABLE: i18next.t('serverinfo.features.featurable', { lng: language }),
        INVITES_DISABLED: i18next.t('serverinfo.features.invites_disabled', { lng: language }),
        INVITE_SPLASH: i18next.t('serverinfo.features.invite_splash', { lng: language }),
        MEMBER_VERIFICATION_GATE_ENABLED: i18next.t('serverinfo.features.member_verification', { lng: language }),
        MORE_STICKERS: i18next.t('serverinfo.features.more_stickers', { lng: language }),
        NEWS: i18next.t('serverinfo.features.news', { lng: language }),
        PARTNERED: i18next.t('serverinfo.features.partnered', { lng: language }),
        PREVIEW_ENABLED: i18next.t('serverinfo.features.preview', { lng: language }),
        ROLE_ICONS: i18next.t('serverinfo.features.role_icons', { lng: language }),
        ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE: i18next.t('serverinfo.features.role_subs_purchase', { lng: language }),
        ROLE_SUBSCRIPTIONS_ENABLED: i18next.t('serverinfo.features.role_subs', { lng: language }),
        TICKETED_EVENTS_ENABLED: i18next.t('serverinfo.features.ticketed_events', { lng: language }),
        VANITY_URL: i18next.t('serverinfo.features.vanity_url', { lng: language }),
        VERIFIED: i18next.t('serverinfo.features.verified', { lng: language }),
        VIP_REGIONS: i18next.t('serverinfo.features.vip_regions', { lng: language }),
        WELCOME_SCREEN_ENABLED: i18next.t('serverinfo.features.welcome_screen', { lng: language })
    };

    return feature.map(featureName => 
        featuresCalc[featureName] ? 
        `<:simJEFF:1109206099346862140> ${featuresCalc[featureName]}` : 
        '<:naoJEFF:1109179756831854592>'
    );
}