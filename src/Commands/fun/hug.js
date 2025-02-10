const Discord = require("discord.js");
const LunarModel = require("../../database/schema/coins_database.js");
const i18next = require('i18next');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName("hug")
        .setDescription("「🎉」Abrace alguem")
        .setDescriptionLocalizations({
            'en-US': '「🎉」Hug someone',
            'en-GB': '「🎉」Hug someone'
        })
        .setDMPermission(false)
        .addUserOption(option => 
            option
            .setName('usuario')
            .setNameLocalizations({
                'en-US': "user",
                'en-GB': 'user',
            })
            .setDescription('O usuario que você ira abraçar')
            .setDescriptionLocalizations({
                'en-US': 'The user you will hug',
                'en-GB': 'The user you will hug'
            })
            .setRequired(true)
        ),
    async execute(interaction, client) {
  const user = interaction.options.getUser('usuario');
  const lunnar_coins = await LunarModel.findOne({ user_id: interaction.user.id });
  const userLanguage = lunnar_coins.language || 'pt';

  const kiss_image = ["https://i.imgur.com/fWCJmEj.gif", "https://i.imgur.com/r9aU2xv.gif", "https://i.imgur.com/wOmoeF8.gif", "https://i.imgur.com/nrdYNtL.gif", "https://i.imgur.com/BPLqSJC.gif", "https://i.imgur.com/ntqYLGl.gif", "https://i.imgur.com/v47M1S4.gif","https://i.imgur.com/4oLIrwj.gif"]
  const kiss_random = kiss_image[Math.floor(Math.random() * kiss_image.length)]
  let mensagem = i18next.t(`hug.message`, { 
    interaction_user: `<@${interaction.user.id}>`,
    user: `<@${user.id}>`,
    lng: userLanguage 
})


  //if (user.id === client.user.id) return interaction.reply({ content: `<:naoJEFF:1109179756831854592> | Eu não quero te beijar não! Mas eu posso ser sua amiga`})
  if (user.id === interaction.user.id) mensagem = i18next.t(`hug.hug_himself`, { 
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