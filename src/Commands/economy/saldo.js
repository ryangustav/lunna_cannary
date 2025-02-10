const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const LunarModel = require("../../database/schema/coins_database.js")
const i18next = require('i18next');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("saldo")
        .setNameLocalizations(
            { 
                  'en-US': 'balance',
                  'en-GB': 'balance',
            }
            )
        .setDescription("「💰」Veja seu saldo de Lunar Coins")
        .setDescriptionLocalizations(
            { 
              'en-US': '「💰」View your Lunar Coin balance',
              'en-GB': '「💰」View your Lunar Coin balance',
            }
    )
        .addUserOption(option =>
            option 
            .setName('user')
            .setDescription('Usuario que você deseja ver o saldo')
            .setDescriptionLocalizations(
                { 
                  'en-US': 'User whose balance you want to see',
                  'en-GB': 'User whose balance you want to see',
                }
        )
            .setRequired(false)
        )
        .setDMPermission(false),

    async execute(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;
    const lunnar_coins_verify = await LunarModel.findOne({ user_id: user.id });
    if (!lunnar_coins_verify) await LunarModel.create({ user_id: user.id, coins: 0, isVip: false, prompts_used: 0 })
       
    const lunnar_coins = await LunarModel.findOne({ user_id: user.id });
    const userLanguage = lunnar_coins.language;

        await interaction.reply({
            content: i18next.t(`saldo.message`, { 
                user: `<@${user.id}>`,
                lunnar_coins: lunnar_coins.coins,
                lng: userLanguage 
            })
        });

    },
};