const Discord = require("discord.js");
const LunarModel = require("../../database/schema/coins_database.js");
const i18next = require('i18next');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName("kiss")
        .setDescription("「🎉」Beije alguem")
        .setDescriptionLocalizations({
            'en-US': '「🎉」Kiss someone',
            'en-GB': '「🎉」Kiss someone'
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
            .setDescription('O usuario que você ira beijar')
            .setDescriptionLocalizations({
                'en-US': 'The user you will kiss',
                'en-GB': 'The user you will kiss'
            })
            .setRequired(true)
        ),
    async execute(interaction, client) {
  const user = interaction.options.getUser('usuario');
  const kiss_image = ["https://i.imgur.com/sGVgr74.gif", "https://i.imgur.com/TItLfqh.gif", "https://i.imgur.com/YbNv10F.gif", "https://i.imgur.com/wQjUdnZ.gif", "https://i.imgur.com/lmY5soG.gif", "https://i.imgur.com/KLVAl0T.gif", "https://i.imgur.com/IgGumrf.gif","https://i.imgur.com/e0ep0v3.gif"]
  const kiss_random = kiss_image[Math.floor(Math.random() * kiss_image.length)]
  const lunnar_coins = await LunarModel.findOne({ user_id: interaction.user.id });
  const userLanguage = lunnar_coins.language || 'pt';
  let mensagem = i18next.t(`kiss.message`, { 
    interaction_user: `<@${interaction.user.id}>`,
    user: `<@${user.id}>`,
    lng: userLanguage 
})

  if (user.id === client.user.id) return i18next.t(`kiss.error`, { 
    lng: userLanguage 
})
  if (user.id === interaction.user.id) mensagem = i18next.t(`kiss.kiss_himself`, { 
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