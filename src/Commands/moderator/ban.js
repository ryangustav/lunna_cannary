const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const getRole = require(`../../util/getRole.js`);
const LunarModel = require("../../database/schema/coins_database.js");
const i18next = require('i18next');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("「🛠️」Banir usuarios")
        .setDescriptionLocalizations({
            'en-US': '「🛠️」Ban users',
            'en-GB': '「🛠️」Ban users',
        })
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option => 
            option
                .setName('user')
                .setNameLocalizations({
                    'en-US': 'user',
                    'en-GB': 'user',
                })
                .setDescription('Usuario que você quer banir')
                .setDescriptionLocalizations({
                    'en-US': 'User you want to ban',
                    'en-GB': 'User you want to ban',
                })
                .setRequired(true)
        )
        .addStringOption(option => 
            option
                .setName('motivo')
                .setNameLocalizations({
                    'en-US': 'reason',
                    'en-GB': 'reason',
                })
                .setDescription('Motivo do banimento')
                .setDescriptionLocalizations({
                    'en-US': 'Reason for the ban',
                    'en-GB': 'Reason for the ban',
                })
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('motivo');
        const lunnar_coins = await LunarModel.findOne({ user_id: interaction.user.id });
        const language = lunnar_coins.language || 'pt';

        try {
            // Verify permissions and roles
            if (!await validateBan(interaction, user, client, language)) {
                return;
            }

            // Send confirmation message
            const confirmMessage = await sendConfirmationMessage(interaction, user, reason, language);
            handleConfirmationResponse(interaction, confirmMessage, user, reason, language);

        } catch (error) {
            console.error('Error in ban command:', error);
            await interaction.reply({
                content: i18next.t('ban.error', { lng: language }),
                flags: MessageFlags.Ephemeral
            });
        }
    }
};

async function validateBan(interaction, user, client, language) {
    // Check if user has required permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        await interaction.reply({
            content: i18next.t('ban.no_permission', { lng: language }),
            flags: MessageFlags.Ephemeral
        });
        return false;
    }

    // Check if target is server owner
    if (interaction.guild.ownerId === user.id) {
        await interaction.reply({
            content: i18next.t('ban.cannot_ban_owner', { lng: language }),
            flags: MessageFlags.Ephemeral
        });
        return false;
    }

    const targetMember = await interaction.guild.members.fetch(user.id).catch(() => null);
    const botMember = interaction.guild.members.me;

    // Role hierarchy checks
    if (targetMember) {
        const userRoles = targetMember.roles.cache;
        const memberRoles = interaction.member.roles.cache;
        const botRoles = botMember.roles.cache;

        if (await getRole(userRoles, memberRoles)) {
            await interaction.reply({
                content: i18next.t('ban.higher_role_user', { lng: language }),
                flags: MessageFlags.Ephemeral
            });
            return false;
        }

        if (await getRole(userRoles, botRoles)) {
            await interaction.reply({
                content: i18next.t('ban.higher_role_bot', { lng: language }),
                flags: MessageFlags.Ephemeral
            });
            return false;
        }
    }

    return true;
}

async function sendConfirmationMessage(interaction, user, reason, language) {
    const embed = new EmbedBuilder()
        .setTitle(i18next.t('ban.confirmation_title', { lng: language }))
        .setColor("#be00e8")
        .setDescription(i18next.t('ban.confirmation_description', {
            moderator: interaction.user,
            user: user,
            reason: reason,
            lng: language
        }));

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Primary)
                .setCustomId("confirm_ban")
                .setEmoji('✅')
                .setLabel(i18next.t('ban.confirm', { lng: language })),
            new ButtonBuilder()
                .setStyle(ButtonStyle.Danger)
                .setCustomId("cancel_ban")
                .setEmoji('❌')
                .setLabel(i18next.t('ban.cancel', { lng: language }))
        );

    return await interaction.reply({
        embeds: [embed],
        components: [buttons],
        fetchReply: true
    });
}

function handleConfirmationResponse(interaction, message, user, reason, language) {
    const collector = message.createMessageComponentCollector({ time: 30000 });

    collector.on("collect", async (int) => {
        if (int.user.id !== interaction.user.id) {
            return int.reply({
                content: i18next.t('ban.wrong_user', { lng: language }),
                flags: MessageFlags.Ephemeral
            });
        }

        await int.deferUpdate();

        if (int.customId === "cancel_ban") {
            await message.delete().catch(() => {});
            return;
        }

        if (int.customId === "confirm_ban") {
            try {
                // Send DM to user
                const dmEmbed = new EmbedBuilder()
                    .setColor('#be00e8')
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setDescription(i18next.t('ban.dm_description', {
                        server: interaction.guild.name,
                        lng: language
                    }))
                    .addFields([
                        {
                            name: i18next.t('ban.dm_user_field', { lng: language }),
                            value: `${user} \n \`${user.id}\``,
                            inline: false
                        },
                        {
                            name: i18next.t('ban.dm_moderator_field', { lng: language }),
                            value: `${interaction.user} \n \`${interaction.user.username}\``,
                            inline: false
                        },
                        {
                            name: i18next.t('ban.dm_reason_field', { lng: language }),
                            value: `\`${reason}\``,
                            inline: false
                        }
                    ]);

                await user.send({ embeds: [dmEmbed] }).catch(() => {});

                // Execute ban
                await interaction.guild.members.ban(user, {
                    deleteMessageSeconds: 60 * 60 * 24 * 7,
                    reason: `${interaction.user.username}: ${reason}`
                });

                await message.edit({
                    content: i18next.t('ban.success', {
                        user: user.username,
                        moderator: interaction.user,
                        lng: language
                    }),
                    embeds: [],
                    components: []
                });

            } catch (error) {
                console.error('Error executing ban:', error);
                await message.edit({
                    content: i18next.t('ban.error', { lng: language }),
                    embeds: [],
                    components: []
                });
            }
        }
    });

    collector.on("end", async (collected, reason) => {
        if (reason === "time" && collected.size === 0) {
            await message.edit({
                content: i18next.t('ban.timeout', { lng: language }),
                embeds: [],
                components: []
            });
        }
    });
}