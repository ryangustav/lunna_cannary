const Discord = require("discord.js");
const LunarModel = require("../../database/schema/coins_database.js");
const i18next = require('i18next');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName("linguagem")
        .setDescription("「📡」Mude minha linguagem")
        .setNameLocalizations(
        { 
              'en-US': 'language',
              'en-GB': 'language',
        }
        )
        .setDescriptionLocalizations(
        { 
          'en-US': '「📡」Change my language',
          'en-GB': '「📡」Change my language',
        }
        )
        .addStringOption(option =>
            option
            .setName('idioma')
            .setDescription('Qual idioma você quer?')
            .setNameLocalizations(
                { 
                      'en-US': 'language',
                      'en-GB': 'language',
                }
                )
            .setDescriptionLocalizations(
                    { 
                      'en-US': 'Which language do you want?',
                      'en-GB': 'Which language do you want?',
                    }
            )
            .addChoices(
            { name: 'Portugues', value: 'pt' },
            { name: 'Ingles', value: 'en' },
            )
            .setRequired(true)
        )
        .setDMPermission(false),

    async execute(interaction, client) {
    const options = interaction.options.getString('idioma')
    const verify_lunnar = await LunarModel.findOne({ user_id: interaction.user.id });

    if (!verify_lunnar) await LunarModel.create({ user_id: interaction.user.id, coins: 0, isVip: false, prompts_used: 0, language: 'pt-BR', image_prompts_used: 0 })
    
    const lunnar = await LunarModel.findOne({ user_id: interaction.user.id });
    const embed = new Discord.EmbedBuilder();
    lunnar.language = options;
    lunnar.save();
 

    embed.setTitle(i18next.t(`language.title`, { 
        botName: client.user.username,
        lng: options
    }))
    embed.setColor(`#be00e8`)
    embed.setDescription(i18next.t(`language.description`, {
        language: options === "en" ? "English" : "Português",
        lng: options
    }))


interaction.reply({ embeds: [embed] })

    },
};