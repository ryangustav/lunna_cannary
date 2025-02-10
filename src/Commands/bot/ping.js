const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const LunarModel = require("../../database/schema/coins_database.js");
const i18next = require('i18next');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("「📡」Veja minha latência atual")
        .setDescriptionLocalizations(
                { 
                  'en-US': '「📡」See my current latency',
                  'en-GB': '「📡」See my current latency',
                }
        )
        .setDMPermission(false),

    async execute(interaction, client) {
        const verify_lunnar = await LunarModel.findOne({ user_id: interaction.user.id });

        if (!verify_lunnar) await LunarModel.create({ user_id: interaction.user.id, coins: 0, isVip: false, prompts_used: 0, language: 'pt-BR', image_prompts_used: 0 })
        
        const lunnar = await LunarModel.findOne({ user_id: interaction.user.id });
        const userLanguage = lunnar.language;

        await interaction.reply({
            content: i18next.t(`ping.message`, { 
                ping: client.ws.ping,
                lng: userLanguage 
            }),
             flags: MessageFlags.Ephemeral
        });

    },
};