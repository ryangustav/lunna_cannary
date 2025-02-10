const { SlashCommandBuilder, ApplicationFlagsBitField, MessageFlags } = require("discord.js");
const LunarModel = require("../../database/schema/coins_database.js")
const i18next = require('i18next');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("prompts")
        .setDescription("「💰」Veja quantos prompts você tem disponivel")
        .setDescriptionLocalizations(
            { 
              'en-US': '「💰」See how many prompts you have available',
              'en-GB': '「💰」See how many prompts you have available',
            }
    )
        .setDMPermission(false),

    async execute(interaction, client) {

    const lunnar_coins_verify = await LunarModel.findOne({ user_id: interaction.user.id });
    if (!lunnar_coins_verify) await LunarModel.create({ user_id: interaction.user.id, coins: 0, isVip: false, prompts_used: 0 })
       
    const lunnar_coins = lunnar_coins_verify ?  lunnar_coins_verify : 0;
    let disponiveis_text, disponiveis_image;
    const disponivel_text = {
        free: 60,
        vip: 160
    }
    const disponivel_image = {
        free: 3,
        vip: 10
    }
    if (lunnar_coins.isVip === true) {
        disponiveis_text = disponivel_text.vip
        disponiveis_image = disponivel_image.vip
    }
    if (lunnar_coins.isVip === false) {
        disponiveis_text = disponivel_text.free
        disponiveis_image = disponivel_image.free
    }

    const userLanguage = lunnar_coins.language;

        await interaction.reply({
            content: i18next.t(`prompts.message`, { 
                used_text: disponiveis_text - lunnar_coins.prompts_used,
                images_used: disponiveis_image - lunnar_coins.image_prompts_used,
                disponiveis_image: disponiveis_image,
                disponiveis_text: disponiveis_text,
                lng: userLanguage 
            }),
             flags: MessageFlags.Ephemeral
        });

    },
}