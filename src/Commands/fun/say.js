const { SlashCommandBuilder } = require("discord.js");
const LunarModel = require("../../database/schema/coins_database.js");
const i18next = require('i18next');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("say")
        .setDescription("「🎉」Faça eu falar algo")
        .setDescriptionLocalizations({
            'en-US': '「🎉」Make me say something',
            'en-GB': '「🎉」Make me say something'
        })
        .setDMPermission(false)
        .addStringOption(option => 
            option
            .setName('mensagem')
            .setNameLocalizations(
                { 
                      'en-US': 'message',
                      'en-GB': 'message',
                }
                )
            .setDescription('Mensagem que sera enviada')
            .setDescriptionLocalizations({
                'en-US': 'Message to be sent',
                'en-GB': 'Message to be sent'
            })
            .setRequired(true)
        ),
    async execute(interaction, client) {
  const mensagem = interaction.options.getString('mensagem')
   
await interaction.reply({
            content: `
${mensagem}

User: ${interaction.user}`,
            ephemeral: false
        });

    },
};