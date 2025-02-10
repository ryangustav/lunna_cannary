const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require("discord.js");
const LunarModel = require("../../database/schema/coins_database.js");
const i18next = require('i18next');
const axios = require("axios");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("「🔎」Veja as informações do usuario")
        .setDescriptionLocalizations({
            'en-US': '「🔎」View user information',
            'en-GB': '「🔎」View user information',
        })
        .setDMPermission(false)
        .addUserOption(option => 
            option
                .setName('user')
                .setNameLocalizations({
                    'en-US': 'user',
                    'en-GB': 'user',
                })
                .setDescription('Usuario que você quer ver as informações')
                .setDescriptionLocalizations({
                    'en-US': 'User whose information you want to view',
                    'en-GB': 'User whose information you want to view',
                })
                .setRequired(false)
        ),

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

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(targetUser.id);
        const userBadges = targetUser.flags?.toArray() || [];

        const topRoles = member.roles.cache
            .sort((a, b) => b.position - a.position)
            .map(role => role)
            .slice(0, 3);


        const joinTimestamp = Math.floor(member.joinedTimestamp / 1000);
        const createdTimestamp = Math.floor(targetUser.createdTimestamp / 1000);
        

        const booster = member.premiumSince ? 
            `<a:Boost:1238718692104212532> (<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>)` : 
            '<:naoJEFF:1109179756831854592>';


        const permissions = member.permissions.toArray().join(', ');


        const bannerData = await axios.get(`https://discord.com/api/v10/users/${targetUser.id}`, {
            headers: { Authorization: `Bot ${client.token}` },
        }).catch(() => ({ data: { banner: null } }));

        const banner = bannerData.data.banner ? 
            `https://cdn.discordapp.com/banners/${targetUser.id}/${bannerData.data.banner}.gif` : 
            null;

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`infoSelect`)
                    .setPlaceholder(i18next.t('userinfo.select_placeholder', { lng: userLanguage }))
                    .addOptions([
                        {
                            label: `${targetUser.username} - ${i18next.t('userinfo.permissions_label', { lng: userLanguage })}`,
                            value: 'permissions',
                            description: i18next.t('userinfo.permissions_description', { lng: userLanguage }),
                            emoji: '<:moderator:1238705467883126865>'
                        },
                        {
                            label: `${targetUser.username} - ${i18next.t('userinfo.roles_label', { lng: userLanguage })}`,
                            value: 'roles',
                            description: i18next.t('userinfo.roles_description', { lng: userLanguage }),
                            emoji: '<:IDD:1052973779153846372>'
                        },
                        {
                            label: `${targetUser.username} - ${i18next.t('userinfo.avatar_label', { lng: userLanguage })}`,
                            value: 'icon',
                            description: i18next.t('userinfo.avatar_description', { lng: userLanguage }),
                            emoji: '<:gratian_imagem:1105112415038865538>'
                        },
                        {
                            label: `${targetUser.username} - ${i18next.t('userinfo.banner_label', { lng: userLanguage })}`,
                            value: 'banner',
                            description: i18next.t('userinfo.banner_description', { lng: userLanguage }),
                            emoji: '<:gratian_imagem:1105112415038865538>'
                        }
                    ])
            );

        const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} | ${i18next.t('userinfo.embed_title', { lng: userLanguage })} <:users:1055062836704976997>`)
            .setColor("#be00e8")
            .setThumbnail(targetUser.avatarURL({ dynamic: true }))
            .setDescription(` `)
            .addFields([
                {
                    name: `<:bughunter2:1238703129298735105> ${i18next.t('userinfo.badges', { lng: userLanguage })}`,
                    value: `${getBadges(userBadges).join("") || '<:naoJEFF:1109179756831854592>'}`,
                    inline: true
                },
                {
                    name: `<a:Boost:1238718692104212532> ${i18next.t('userinfo.booster', { lng: userLanguage })}`,
                    value: booster,
                    inline: true
                },
                {
                    name: `<:moderator:1238705467883126865> ${i18next.t('userinfo.top_roles', { lng: userLanguage })}`,
                    value: topRoles.length ? topRoles.join(', ') : i18next.t('userinfo.no_roles', { lng: userLanguage }),
                    inline: false
                },
                {
                    name: `<:timer:1104785133116080220> ${i18next.t('userinfo.join_date', { lng: userLanguage })}`,
                    value: `<t:${joinTimestamp}:f> (<t:${joinTimestamp}:R>)`,
                    inline: true
                },
                {
                    name: `<:timer:1104785133116080220> ${i18next.t('userinfo.account_created', { lng: userLanguage })}`,
                    value: `<t:${createdTimestamp}:f> (<t:${createdTimestamp}:R>)`,
                    inline: true
                }
            ]);

        await interaction.reply({ content: `${targetUser}`, embeds: [embed], components: [row] });

        const collector = message.createMessageComponentCollector({ time: 300000 }); // 5 minute timeout

        collector.on('collect', async (int) => {
            if (int.message.id !== message.id) return;
            if (int.user.id !== interaction.user.id) {
                return int.reply({ 
                    content: i18next.t('userinfo.not_your_interaction', { lng: userLanguage }), 
                    flags: MessageFlags.Ephemeral 
                });
            }

            if (!int.isStringSelectMenu()) return;

            switch (int.values[0]) {
                case 'permissions':
                    await int.reply({ 
                        content: `\`\`\`${permissions}\`\`\``, 
                        flags: MessageFlags.Ephemeral 
                    });
                    break;

                case 'roles':
                    const allRoles = member.roles.cache
                        .sort((a, b) => b.position - a.position)
                        .map(role => role)
                        .join(', ');
                    await int.reply({ 
                        content: allRoles || i18next.t('userinfo.no_roles', { lng: userLanguage }), 
                        flags: MessageFlags.Ephemeral 
                    });
                    break;

                case 'icon':
                    if (!targetUser.avatarURL()) {
                        return int.reply({ 
                            content: i18next.t('userinfo.no_avatar', { lng: userLanguage }), 
                            flags: MessageFlags.Ephemeral 
                        });
                    }
                    await int.reply({ 
                        content: targetUser.avatarURL({ dynamic: true }), 
                        flags: MessageFlags.Ephemeral 
                    });
                    break;

                case 'banner':
                    if (!banner) {
                        return int.reply({ 
                            content: i18next.t('userinfo.no_banner', { lng: userLanguage }), 
                            flags: MessageFlags.Ephemeral 
                        });
                    }
                    await int.reply({ 
                        embeds: [new EmbedBuilder().setImage(banner)], 
                        flags: MessageFlags.Ephemeral 
                    });
                    break;
            }
        });

        collector.on('end', () => {
            if (message.editable) {
                row.components[0].setDisabled(true);
                message.edit({ components: [row] }).catch(() => {});
            }
        });
    },
};

function getBadges(badges) {
    if (!badges?.length) return ['<:naoJEFF:1109179756831854592>'];

    const badgeEmojis = {
        ActiveDeveloper: "<:activedev:1238702739245236284>",
        BugHunterLevel1: '<:bughunter:1238703112831766548>',
        BugHunterLevel2: "<:bughunter2:1238703129298735105>",
        PremiumEarlySupporter: "<:EarlySupporter:1238703275826479105>",
        Partner: "<a:partner:1238703567645446216>",
        Staff: "<a:staff:1238703736524771491>",
        HypeSquadOnlineHouse1: "<:hypesquad3:1238703963432292452>",
        HypeSquadOnlineHouse2: "<:hypesquad:1238704866948546621>",
        HypeSquadOnlineHouse3: "<:hypesquad2:1238704992580538431>",
        Hypesquad: "<:hypesquadevents:1238705175695196212>",
        CertifiedModerator: "<:moderator:1238705467883126865>",
        VerifiedDeveloper: "<:developer:1238705584098775100>"
    };

    return badges.map(badge => badgeEmojis[badge] || '<:naoJEFF:1109179756831854592>');
}