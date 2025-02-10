const Discord = require("discord.js");
const LunarModel = require("../../database/schema/coins_database.js");
const i18next = require('i18next');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName("spank")
        .setDescription("「🎉」Bata alguem")
        .setDescriptionLocalizations({
            'en-US': '「🎉」Hit someone',
            'en-GB': '「🎉」Hit someone'
        })
        .setDMPermission(false)
        .addUserOption(option => 
            option
            .setName('usuario')
            .setNameLocalizations(
                { 
                      'en-US': 'user',
                      'en-GB': 'user',
                }
                )
            .setDescription('O usuario que você ira bater')
            .setDescriptionLocalizations({
                'en-US': 'The user you will hit',
                'en-GB': 'The user you will hit'
            })
            .setRequired(true)
        ),
    async execute(interaction, client) {
  const user = interaction.options.getUser('usuario');
  const kiss_image = ["https://i.imgur.com/SMskPot.gif", "https://i.imgur.com/KWi1dAV.mp4", "https://i.imgur.com/NSeL8jO.gif", "https://i.imgur.com/kUNr4vk.gif", "https://i.imgur.com/T00nSoV.gif", "https://i.imgur.com/b9Iv95p.gif", "https://i.imgur.com/NaLhZ8m.gif","https://i.imgur.com/8p95SIi.gif"]
  const kiss_random = kiss_image[Math.floor(Math.random() * kiss_image.length)]
  const lunnar_coins = await LunarModel.findOne({ user_id: interaction.user.id });
  const userLanguage = lunnar_coins.language || 'pt';
  let mensagem =  i18next.t(`hit.message`, { 
    interaction_user: `<@${interaction.user.id}>`,
    user: `<@${user.id}>`,
    lng: userLanguage 
})


 // if (user.id === client.user.id) return interaction.reply({ content: `<:naoJEFF:1109179756831854592> | Eu não quero te beijar não! Mas eu posso ser sua amiga`})
  if (user.id === interaction.user.id) mensagem =  i18next.t(`hit.hit_himself`, { 
    interaction_user: `<@${interaction.user.id}>`,
    lng: userLanguage 
})


const embed = new Discord.EmbedBuilder()
.setDescription(`${mensagem}`)
.setColor("#be00e8")
.setImage(`${kiss_random}`)

const msg = await interaction.reply({
embeds: [embed],
})
setTimeout(() => {
    msg.delete()
}, 15000)
    },
};