const Discord = require("discord.js");
const topgg = require('../../util/topgg-api.js')
const axios = require('axios')
const LunarModel = require("../../database/schema/coins_database.js");
const i18next = require('i18next');
require('dotenv').config
module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName("vote")
        .setDescription("「📡」Vote em mim")
        .setDescriptionLocalizations(
            { 
              'en-US': '「📡」Vote for me',
              'en-GB': '「📡」Vote for me',
            }
    )
        .setDMPermission(false),

    async execute(interaction, client) {
    const votou = await axios.get(`https://lunna.discloud.app/get-voted?id=${interaction.user.id}`);
    //console.log(votou.data)
    let lunna_vote = await LunarModel.findOne({ user_id: interaction.user.id });
    const time = Math.floor(Date.now() / 1000)
    if (!lunna_vote) {
    await LunarModel.create({ user_id: interaction.user.id, coins: 0, isVip: false, prompts_used: 0 })
    lunna_vote = await LunarModel.findOne({ user_id: interaction.user.id });
    }
    const userLanguage = lunnar.language;

if (votou.data.hasVoted === false || lunna_vote.voteTimestamp > time || votou.data.hasCollected === true) {

return interaction.reply({ content: i18next.t(`vote.message`, { 
    lng: userLanguage 
}),  flags: Discord.MessageFlags.Ephemeral })
    } else if (votou.data.hasVoted === true && votou.data.hasCollected === false) {
        const date = new Date()
        date.setHours('14')
        const vote = Math.floor(date.getTime() / 1000)
        const random_vote= Math.floor(Math.random() * (10000 - 1000 + 1)) + 1000;

        await LunarModel.updateOne({ user_id: interaction.user.id }, { $set: { hasVoted: true, voteTimestamp: vote, prompts_used: 0, image_prompts_used: 0 }})
        lunna_vote.coins += random_vote
        lunna_vote.save()
        
        interaction.reply({ content: i18next.t(`vote.voted`, { 
            user: `<@${interaction.user.id}>`,
            lng: userLanguage 
        }), ephemeral: false })
    }
    },
};