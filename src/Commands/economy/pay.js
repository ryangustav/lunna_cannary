const { SlashCommandBuilder } = require("discord.js");
const LunarModel = require("../../database/schema/coins_database.js");
const dailyCollect = require('../../database/schema/daily_schema.js');
const transactionsModel = require('../../database/schema/transactions.js');
const i18next = require('i18next');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pay")
        .setDescription("「💰」Pague lunar coins")
        .setDescriptionLocalizations({
            'en-US': '「💰」Pay Lunar Coins',
            'en-GB': '「💰」Pay Lunar Coins',
        })
        .setDMPermission(false)
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Quem você irá pagar?")
                .setDescriptionLocalizations({
                    'en-US': 'Who will you pay?',
                    'en-GB': 'Who will you pay?',
                })
                .setRequired(true)
        )
        .addNumberOption(option =>
            option
                .setName("valor")
                .setNameLocalizations({
                    'en-US': 'value',
                    'en-GB': 'value',
                })
                .setDescription("Qual valor que você irá enviar?")
                .setDescriptionLocalizations({
                    'en-US': 'What amount will you send?',
                    'en-GB': 'What amount will you send?',
                })
                .setRequired(true)
                .setMinValue(10)
        ),

    async execute(interaction) {
        try {
            const user = interaction.options.getUser('user');
            const valor = interaction.options.getNumber('valor');

            if (!user || !valor) {
                return interaction.reply({
                    content: "Erro: Usuário ou valor inválido.",
                    ephemeral: true
                });
            }

            
            const [daily_payer, daily_receiver, lunar_payer, lunar_receiver] = await Promise.all([
                dailyCollect.findOne({ user_id: interaction.user.id }),
                dailyCollect.findOne({ user_id: user.id }),
                LunarModel.findOne({ user_id: interaction.user.id }),
                LunarModel.findOne({ user_id: user.id })
            ]);

          
            const userLanguage = lunar_receiver?.language || 'pt';
            const authorLanguage = lunar_payer?.language || 'pt';

         
            if (user.id === interaction.user.id) {
                return interaction.reply({
                    content: i18next.t('pay.autosend', {
                        lng: authorLanguage
                    }),
                    ephemeral: true
                });
            }

         
            if (!daily_payer?.daily_collected) {
                return interaction.reply({
                    content: i18next.t('pay.daily', {
                        lng: authorLanguage
                    }),
                    ephemeral: true
                });
            }

            
            if (!daily_receiver?.daily_collected) {
                return interaction.reply({
                    content: i18next.t('pay.daily_user', {
                        lng: userLanguage
                    }),
                    ephemeral: false
                });
            }

            
            if (!lunar_payer || lunar_payer.coins < valor) {
                return interaction.reply({
                    content: i18next.t('pay.insuficient_coins', {
                        lng: authorLanguage
                    }),
                    ephemeral: true
                });
            }

         
            const transactionId = Math.floor(Math.random() * (999999999 - 111111111 + 1) + 111111111);
            const timestamp = Math.floor(Date.now() / 1000);

            
            if (!lunar_receiver) {
                await LunarModel.create({
                    user_id: user.id,
                    coins: valor,
                    language: userLanguage
                });
            } else {
                lunar_receiver.coins += valor;
                await lunar_receiver.save();
            }

        
            lunar_payer.coins -= valor;
            await lunar_payer.save();

           
            const transactionData = {
                id: transactionId,
                timestamp: timestamp
            };

            
            const payerTransaction = {
                ...transactionData,
                mensagem: i18next.t('pay.message_transactions', {
                    amount: valor,
                    user_username: user.username,
                    id: user.id,
                    lng: authorLanguage
                })
            };

            const receiverTransaction = {
                ...transactionData,
                mensagem: i18next.t('pay.message_user_transactions', {
                    amount: valor,
                    user_username: interaction.user.username,
                    id: interaction.user.id,
                    lng: userLanguage
                })
            };

          
            await Promise.all([
                updateTransactions(interaction.user.id, payerTransaction),
                updateTransactions(user.id, receiverTransaction)
            ]);

            
            return interaction.reply({
                content: i18next.t('pay.message', {
                    user: `<@${interaction.user.id}>`,
                    user_two: `<@${user.id}>`,
                    amount: valor,
                    lng: authorLanguage
                })
            });

        } catch (error) {
            console.error('Erro ao processar pagamento:', error);
            return interaction.reply({
                content: i18next.t('pay.error', {
                    lng: 'pt'
                }),
                ephemeral: true
            });
        }
    }
};

async function updateTransactions(userId, transactionData) {
    try {
        const userTransactions = await transactionsModel.findOne({ user_id: userId });

        if (!userTransactions) {
            await transactionsModel.create({
                user_id: userId,
                transactions: [transactionData],
                transactions_ids: [transactionData.id]
            });
        } else {
            userTransactions.transactions.push(transactionData);
            userTransactions.transactions_ids.push(transactionData.id);
            await userTransactions.save();
        }
    } catch (error) {
        console.error('Erro ao atualizar transações:', error);
        throw error;
    }
}