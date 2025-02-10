const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const LunarModel = require("../../database/schema/coins_database.js");
const i18next = require('i18next');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clear")
        .setDescription("「🛠️」Apague mensagens")
        .setDescriptionLocalizations({
            'en-US': '「🛠️」Delete messages',
            'en-GB': '「🛠️」Delete messages',
        })
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addNumberOption(option => 
            option
                .setName('quantidade')
                .setNameLocalizations({
                    'en-US': 'amount',
                    'en-GB': 'amount',
                })
                .setDescription('Quantidade de mensagens que você quer apagar (1 a 1000)')
                .setDescriptionLocalizations({
                    'en-US': 'Amount of messages you want to delete (1 to 1000)',
                    'en-GB': 'Amount of messages you want to delete (1 to 1000)',
                })
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const quantidade = interaction.options.getNumber('quantidade');
        const lunnar_coins = await LunarModel.findOne({ user_id: interaction.user.id });
        const language = lunnar_coins.language || 'pt';

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) || !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: i18next.t('clear.no_permission', { lng: language }), 
                ephemeral: true 
            });
        }

        if (!quantidade || quantidade < 1 || quantidade > 1000) {
            return interaction.reply({ 
                content: i18next.t('clear.invalid_amount', { lng: language }), 
                ephemeral: true 
            });
        }

        await interaction.reply({ 
            content: i18next.t('clear.deleting', { lng: language }), 
            ephemeral: true 
        });

        let mensagensApagadas = 0;
        let restante = quantidade;

        try {
            while (restante > 0) {
                const apagar = Math.min(restante, 100);
                const deletadas = await interaction.channel.bulkDelete(apagar, true);
                mensagensApagadas += deletadas.size;
                restante -= deletadas.size;

                if (deletadas.size === 0) {
                    break;
                }
            }
        } catch (error) {
            if (error.code === 50034) {
                return interaction.followUp({
                    content: i18next.t('clear.old_messages', { 
                        count: mensagensApagadas,
                        lng: language 
                    }),
                    ephemeral: false
                });
            } else {
                console.error(error);
                return interaction.followUp({
                    content: i18next.t('clear.error', { lng: language }),
                    ephemeral: true
                });
            }
        }

        return interaction.followUp({
            content: i18next.t('clear.success', { 
                count: mensagensApagadas,
                lng: language 
            }),
            ephemeral: false
        });
    }
};