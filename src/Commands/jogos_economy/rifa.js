const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RifaUserModel = require('../../database/schema/rifa_user_schema.js');
const RifaModel = require('../../database/schema/rifas_schema.js');
const LunarModel = require('../../database/schema/coins_database.js');
const i18next = require('i18next');

const RIFA_CONFIG = {
    PRICE: 100,
    MAX_TICKETS: 100000,
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rifa')
        .setDescription('「💰」Sistema de rifas')
        .setDescriptionLocalizations({
            'en-US': '「💰」Raffle system',
            'en-GB': '「💰」Raffle system'
        })
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('「💰」Ver informações da rifa atual')
                .setDescriptionLocalizations({
                    'en-US': '「💰」View current raffle information',
                    'en-GB': '「💰」View current raffle information'
                })
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('「💰」Comprar tickets da rifa')
                .setDescriptionLocalizations({
                    'en-US': '「💰」Buy raffle tickets',
                    'en-GB': '「💰」Buy raffle tickets'
                })
                .addNumberOption(option =>
                    option.setName('quantidade')
                        .setNameLocalizations({
                            'en-US': 'amount',
                            'en-GB': 'amount'
                        })
                        .setDescription('Quantidade de tickets para comprar')
                        .setDescriptionLocalizations({
                            'en-US': 'Amount of tickets to buy',
                            'en-GB': 'Amount of tickets to buy'
                        })
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(RIFA_CONFIG.MAX_TICKETS)
                )
        ),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const lunar = await LunarModel.findOne({ user_id: interaction.user.id });
        const userLanguage = lunar?.language || 'pt-BR';

        if (subcommand === 'info') {
            return handleInfo(interaction, userLanguage, client);
        } else if (subcommand === 'buy') {
            return handleBuy(interaction, lunar, userLanguage);
        }
    }
};

async function handleInfo(interaction, language, client) {
    await interaction.deferReply();

    try {
        const rifaData = await RifaModel.findOne({}) || await new RifaModel({ rifa_user: [] }).save();
        const nextDraw = getNextDrawTime();
        
        const totalTickets = rifaData.rifa_user.reduce((sum, ticket) => sum + 1, 0);
        const totalValue = totalTickets * RIFA_CONFIG.PRICE * 1.50;
        const winner = rifaData.rifa_winner_username;

        const embed = new EmbedBuilder()
            .setTitle(i18next.t('rifa.info.title', { lng: language }))
            .setColor('#be00e8')
            .addFields(
                { name: i18next.t('rifa.info.last_winner', { lng: language }), value: `${winner || i18next.t('rifa.info.unknown', { lng: language })}`, inline: false },
                { name: i18next.t('rifa.info.prize', { lng: language }), value: totalValue.toLocaleString('pt-BR').toString(), inline: true },
                { name: i18next.t('rifa.info.ticket_price', { lng: language }), value: `100`, inline: false },
                { name: i18next.t('rifa.info.total_tickets', { lng: language }), value: totalTickets.toLocaleString("pt-BR").toString(), inline: true },
                { name: i18next.t('rifa.info.last_prize', { lng: language }), value: `${rifaData.last_rifa_prize || i18next.t('rifa.info.unknown_prize', { lng: language })}`, inline: true },
                { name: i18next.t('rifa.info.next_draw', { lng: language }), value: `<t:${Math.floor(nextDraw.getTime() / 1000)}:R>`, inline: true }
            );

        return interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error in raffle info:', error);
        return interaction.editReply(i18next.t('rifa.error', { lng: language }));
    }
}

async function handleBuy(interaction, lunar, language) {
    await interaction.deferReply();

    try {
        const amount = interaction.options.getNumber('quantidade');
        const totalCost = amount * RIFA_CONFIG.PRICE;

        if (!lunar || lunar.coins < totalCost) {
            return interaction.editReply(i18next.t('rifa.insufficient_funds', { lng: language }));
        }

        const rifaData = await RifaModel.findOne({}) || await new RifaModel({ rifa_user: [] }).save();
        const userRifa = await RifaUserModel.findOne({ user_id: interaction.user.id }) || 
                        await new RifaUserModel({ user_id: interaction.user.id, rifa_user: [] }).save();

        const tickets = Array(amount).fill().map(() => ({
            ticket_id: generateTicketId(),
            user_id: interaction.user.id,
            timestamp: new Date()
        }));

        rifaData.rifa_user.push(...tickets);
        userRifa.rifa_user.push(...tickets);
        lunar.coins -= totalCost;

        await Promise.all([
            rifaData.save(),
            userRifa.save(),
            lunar.save()
        ]);

        return interaction.editReply(i18next.t('rifa.purchase_success', { 
            amount, 
            total: totalCost,
            lng: language 
        }));
    } catch (error) {
        console.error('Error in raffle purchase:', error);
        return interaction.editReply(i18next.t('rifa.error', { lng: language }));
    }
}

function generateTicketId() {
    return Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
}

function getNextDrawTime() {
    const now = new Date();
    const nextDraw = new Date(now);
    nextDraw.setHours(nextDraw.getHours() + 1);
    nextDraw.setMinutes(0);
    nextDraw.setSeconds(0);
    nextDraw.setMilliseconds(0);
    return nextDraw;
}