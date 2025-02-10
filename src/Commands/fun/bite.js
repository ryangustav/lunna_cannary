const Discord = require("discord.js");
const LunarModel = require("../../database/schema/coins_database.js");
const i18next = require('i18next');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName("bite")
        .setDescription("「🎉」Morda alguem")
        .setDescriptionLocalizations(
            { 
              'en-US': '「🎉」Bite someone',
              'en-GB': '「🎉」Bite someone',
            }
      )
        .setDMPermission(false)
        .addUserOption(option => 
            option
            .setName('usuario')
            .setNameLocalizations({
                'en-US': "user",
                'en-GB': "user",
            })
            .setDescription('O usuario que você ira morder')
            .setDescriptionLocalizations(
                { 
                  'en-US': 'The user you will bite',
                  'en-GB': 'The user you will bite',
                }
          )
            .setRequired(true)
        ),
    async execute(interaction, client) {
  const user = interaction.options.getUser('usuario');
  const lunnar_coins = await LunarModel.findOne({ user_id: interaction.user.id });
  const userLanguage = lunnar_coins.language || 'pt';

  const kiss_image = ["https://i.imgur.com/VFjoWe4.gif", "https://i.imgur.com/oPw9dph.gif", "https://i.imgur.com/qQzKwP9.gif", "https://i.imgur.com/WxYtS74.gif", "https://i.imgur.com/S6Je2yz.gif", "https://i.imgur.com/RxcxL2z.gif", "https://i.imgur.com/ykQA3hF.gif","https://i.imgur.com/q9Q9B1Z.gif"]
  const kiss_random = kiss_image[Math.floor(Math.random() * kiss_image.length)]
  let mensagem = i18next.t(`bite.message`, { 
    interaction_user: `<@${interaction.user.id}>`,
    user: `<@${user.id}>`,
    lng: userLanguage 
})


 // if (user.id === client.user.id) return interaction.reply({ content: `<:naoJEFF:1109179756831854592> | Eu não quero te beijar não! Mas eu posso ser sua amiga`})
  if (user.id === interaction.user.id) mensagem = i18next.t(`bite.bit_himself`, { 
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