const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const LunarModel = require("../../database/schema/coins_database.js");
const dailyCollect = require('../../database/schema/daily_schema.js');
const transactionsModel = require('../../database/schema/transactions.js')
const i18next = require('i18next');


module.exports = {
    data: new SlashCommandBuilder()
        .setName("daily")
        .setDescription("「💰」Colete o seu daily")
        .setDescriptionLocalizations(
            { 
              'en-US': '「💰」Collect your daily',
              'en-GB': '「💰」Collect your daily',
            }
    )
        .setDMPermission(false),

    async execute(interaction, client) {
    const daily = await dailyCollect.findOne({ user_id: interaction.user.id })
    const lunar_coins = await LunarModel.findOne({ user_id: interaction.user.id })
    const transactions = await transactionsModel.findOne({ user_id: interaction.user.id })
    const id = Math.floor(Math.random() * (999999999 - 111111111 + 1) + 111111111)
    const timestamp = Math.floor(Date.now() / 1000)
    
    if (!daily || daily.daily_collected === false) {

    const random_daily = Math.floor(Math.random() * (5000 - 1000 + 1)) + 1000;


    if (!lunar_coins) {
    await LunarModel.create({ user_id: interaction.user.id, coins: random_daily, isVip: false, prompts_used: 0 })
    } else {
    lunar_coins.coins += random_daily;
    lunar_coins.save();
    }

    const userLanguage = lunar_coins.language;
    if (!daily) {
    await dailyCollect.create({ user_id: interaction.user.id, daily_collected: true})
    } else {
    daily.daily_collected = true;
    daily.save();
    }
    if (!transactions) {
    transactionsModel.create({ user_id: interaction.user.id, transactions: [{ id: id, timestamp: timestamp, mensagem: `Resgatou o daily no valor de \`${random_daily}\` lunar coins`}], transactions_ids: [id]})
    } else {
    transactions.transactions.push({id: id, timestamp: timestamp, mensagem: i18next.t(`daily.transaction`, { 
        daily: random_daily,
        lng: userLanguage 
    })})
    transactions.transactions_ids.push(id)
    transactions.save()
    }
    interaction.reply({ 
    content: i18next.t(`daily.message`, { 
        daily: random_daily,
        lng: userLanguage 
    }),
     flags: MessageFlags.Ephemeral
    })

    } else if (daily.daily_collected === true) {
    interaction.reply({ content: i18next.t(`daily.error`, { 
        lng: userLanguage 
    }),  flags: MessageFlags.Ephemeral })
    }
    }
};