const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const LunarModel = require("../../database/schema/coins_database.js");
const dailyCollect = require('../../database/schema/daily_schema.js');
const transactionsModel = require('../../database/schema/transactions.js');
const i18next = require('i18next');

const GAME_CONSTANTS = {
    TYPES: ['♥', '♦', '♠', '♣'],
    CARDS: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
    MIN_BET: 50,
    DEALER_MIN_STAND: 19,
    DEALER_MIN_HIT: 14,
    BLACKJACK: 21
};

class BlackjackGame {
    constructor() {
        this.dealerCards = [];
        this.playerCards = [];
        this.dealerSum = 0;
        this.playerSum = 0;
    }

    getCardValue(card) {
        if (['J', 'Q', 'K'].includes(card)) return 10;
        if (card === 'A') return 1;
        return Number(card);
    }

    drawCard() {
        const type = GAME_CONSTANTS.TYPES[Math.floor(Math.random() * GAME_CONSTANTS.TYPES.length)];
        const card = GAME_CONSTANTS.CARDS[Math.floor(Math.random() * GAME_CONSTANTS.CARDS.length)];
        return { card, type, value: this.getCardValue(card) };
    }

    async dealInitialCards() {
        for (let i = 0; i < 2; i++) {
            const dealerCard = this.drawCard();
            const playerCard = this.drawCard();
            
            this.dealerCards.push(`${dealerCard.card}${dealerCard.type}`);
            this.playerCards.push(`${playerCard.card}${playerCard.type}`);
            
            this.dealerSum += dealerCard.value;
            this.playerSum += playerCard.value;
        }
    }

    async dealerDraw() {
        if (this.dealerSum > GAME_CONSTANTS.BLACKJACK) return;
        
        const numCards = this.dealerSum < 5 ? 2 : 1;
        for (let i = 0; i < numCards; i++) {
            const card = this.drawCard();
            this.dealerCards.push(`${card.card}${card.type}`);
            this.dealerSum += card.value;
        }
    }

    getGameResult() {
        if (this.playerSum === GAME_CONSTANTS.BLACKJACK) return 'double';
        if (this.playerSum > GAME_CONSTANTS.BLACKJACK) return 'lose';
        if (this.dealerSum > GAME_CONSTANTS.BLACKJACK) return 'win';
        if (this.playerSum === this.dealerSum) return 'bet';
        return this.playerSum > this.dealerSum ? 'win' : 'lose';
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("blackjack")
        .setDescription("「💰」Jogue blackjack")
        .setDescriptionLocalizations({
            'en-US': '「💰」Play blackjack',
            'en-GB': '「💰」Play blackjack',
        })
        .setDMPermission(false)
        .addNumberOption(option => 
            option
            .setName("valor")
            .setNameLocalizations({
                'en-US': 'value',
                'en-GB': 'value'
            })
            .setDescription("Qual valor que você ira apostar?")
            .setDescriptionLocalizations({
                'en-US': 'How much do you want to bet?',
                'en-GB': 'How much do you want to bet?'
            })
            .setRequired(true)
        ),
        
    async execute(interaction, client) {
        
        const user = await LunarModel.findOne({ user_id: interaction.user.id });
        if (!user) {
            await LunarModel.create({ 
                user_id: interaction.user.id, 
                coins: 0, 
                isVip: false, 
                prompts_used: 0, 
                language: 'pt-BR', 
                image_prompts_used: 0 
            });
        }
        
        const userLanguage = user?.language || 'pt-BR';
        const betAmount = interaction.options.getNumber('valor');
        const daily = await dailyCollect.findOne({ user_id: interaction.user.id });

        // Validation checks
        if (!daily?.daily_collected) {
            return interaction.reply({ 
                content: i18next.t('blackjack.needDaily', { lng: userLanguage }),
                flags: MessageFlags.Ephemeral 
            });
        }

        if (!user || user.coins < betAmount) {
            return interaction.reply({ 
                content: i18next.t('blackjack.insufficientFunds', { lng: userLanguage }),
                flags: MessageFlags.Ephemeral 
            });
        }

        if (betAmount < GAME_CONSTANTS.MIN_BET) {
            return interaction.reply({ 
                content: i18next.t('blackjack.minBet', { 
                    min: GAME_CONSTANTS.MIN_BET,
                    lng: userLanguage 
                }),
                flags: MessageFlags.Ephemeral 
            });
        }

        // Start game
        user.coins -= Math.floor(betAmount);
        await user.save();

        const game = new BlackjackGame();
        await game.dealInitialCards();

        const buttons = createGameButtons();
        const embed = createGameEmbed(client, game, betAmount, userLanguage);
        
        const message = await interaction.channel.send({ 
            embeds: [embed], 
            components: [buttons] 
        });

        setupGameCollector(message, interaction, game, betAmount, user, userLanguage);
    }
};

function createGameButtons(disabled = false) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('Hit')
                .setLabel('Hit')
                .setStyle('Primary')
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId('Hit_double')
                .setLabel('Double Hit')
                .setStyle('Secondary')
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId('Stand')
                .setLabel('Stand')
                .setStyle('Success')
                .setDisabled(disabled)
        );
}

function createGameEmbed(client, game, betAmount, userLanguage, gameEnded = false, result = '') {
    const embed = new EmbedBuilder()
        .setTitle(`${client.user.username} | ${i18next.t('blackjack.title', { lng: userLanguage })}`)
        .setColor("#be00e8")
        .setDescription(i18next.t('blackjack.bet', { 
            amount: betAmount,
            lng: userLanguage 
        }))
        .addFields(
            {
                name: i18next.t('blackjack.yourHand', { lng: userLanguage }),
                value: `**${game.playerCards.join(' ')}** (${game.playerSum})`,
                inline: false
            },
            {
                name: i18next.t('blackjack.dealer', { lng: userLanguage }),
                value: gameEnded ? 
                    `${game.dealerCards.join(' ')} (${game.dealerSum})` : 
                    `||${game.dealerCards.join(' ')}|| (${game.dealerSum})`,
                inline: false
            }
        );

    if (gameEnded) {
        embed.addFields({
            name: ' ',
            value: i18next.t(`blackjack.results.${result}`, { lng: userLanguage }),
            inline: false
        });
    }

    return embed;
}

function setupGameCollector(message, interaction, game, betAmount, user, userLanguage) {
    const collector = message.channel.createMessageComponentCollector();

    collector.on('collect', async (int) => {
        if (int.message.id !== message.id || int.user.id !== interaction.user.id) return;
        await int.deferUpdate();

        switch (int.customId) {
            case 'Hit':
                handleHit(game, 1);
                break;
            case 'Hit_double':
                handleHit(game, 2);
                break;
            case 'Stand':
                await handleStand(game, message, interaction, betAmount, user, userLanguage, interaction.client);
                return;
        }

        if (game.dealerSum < GAME_CONSTANTS.DEALER_MIN_STAND) {
            await game.dealerDraw();
        }

        const embed = createGameEmbed(interaction.client, game, betAmount, userLanguage);
        await message.edit({ embeds: [embed], components: [createGameButtons()] });
    });
}

async function handleHit(game, numCards) {
    for (let i = 0; i < numCards; i++) {
        const card = game.drawCard();
        game.playerCards.push(`${card.card}${card.type}`);
        game.playerSum += card.value;
    }
}

async function handleStand(game, message, interaction, betAmount, user, userLanguage, client) {
    while (game.dealerSum < GAME_CONSTANTS.DEALER_MIN_HIT) {
        await game.dealerDraw();
    }

    const result = game.getGameResult();
    await updateUserBalance(user, betAmount, result);
    await recordTransaction(interaction.user.id, betAmount, result, userLanguage);

    const embed = createGameEmbed(client, game, betAmount, userLanguage, true, result);
    await message.edit({ 
        embeds: [embed], 
        components: [createGameButtons(true)] 
    });
}

async function updateUserBalance(user, betAmount, result) {
    const multipliers = {
        'win': 2,
        'bet': 1,
        'double': 3,
        'lose': 0
    };

    const multiplier = multipliers[result];
    if (multiplier > 0) {
        user.coins += Math.floor(betAmount * multiplier);
        await user.save();
    }
}

async function recordTransaction(userId, amount, result, userLanguage) {
    const id = Math.floor(Math.random() * (999999999 - 111111111 + 1) + 111111111);
    const timestamp = Math.floor(Date.now() / 1000);
    const message = i18next.t(`blackjack.transactions.${result}`, {
        amount: amount,
        lng: userLanguage
    });

    const transaction = await transactionsModel.findOne({ user_id: userId });
    if (!transaction) {
        await transactionsModel.create({
            user_id: userId,
            transactions: [{ id, timestamp, mensagem: message }],
            transactions_ids: [id]
        });
    } else {
        transaction.transactions.push({ id, timestamp, mensagem: message });
        transaction.transactions_ids.push(id);
        await transaction.save();
    }
}