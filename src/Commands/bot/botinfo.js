const Discord = require("discord.js");
const LunarModel = require("../../database/schema/coins_database.js");
const i18next = require('i18next');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName("botinfo")
        .setDescription("「📡」Veja as minhas informações")
        .setNameLocalizations(
            { 
                  'en-US': 'botinfo',
                  'en-GB': 'botinfo',
            }
            )
        .setDescriptionLocalizations(
                { 
                  'en-US': '「📡」See my information',
                  'en-GB': '「📡」See my information',
                }
        )
        .setDMPermission(false),

    async execute(interaction, client) {

        const verify_lunnar = await LunarModel.findOne({ user_id: interaction.user.id });

        if (!verify_lunnar) await LunarModel.create({ user_id: interaction.user.id, coins: 0, isVip: false, prompts_used: 0, language: 'pt-BR', image_prompts_used: 0 })
        
        const lunnar = await LunarModel.findOne({ user_id: interaction.user.id });
        const userLanguage = lunnar.language;

        const embed = new Discord.EmbedBuilder()
            .setTitle(i18next.t(`botinfo.title`, { 
                botName: client.user.username,
                lng: userLanguage 
            }))
            .setColor('#be00e8')
            .setDescription(i18next.t(`botinfo.description`, {
                user: `<@${interaction.user.id}>`,
                uptime: `<t:${Math.floor(client.readyTimestamp / 1000)}:R>`,
                users: client.users.cache.size,
                servers: client.guilds.cache.size,
                lng: userLanguage
            }));

        interaction.reply({ embeds: [embed] });
    },
};