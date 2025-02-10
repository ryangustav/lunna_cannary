const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const LunarModel = require("../../database/schema/coins_database.js");
const dailyCollect = require('../../database/schema/daily_schema.js');
const transactionsModel = require('../../database/schema/transactions.js');
const i18next = require('i18next');

// Game constants
const GAME_CONFIG = {
    MIN_BET: 50,
    TOTAL_MINES: 3,
    GRID_SIZE: 4,
    MULTIPLIER_INCREMENT: 0.25,
    INITIAL_MULTIPLIER: 1.00
};

const EMOJIS = {
    BOX: '<:caixa:1051978207110377573>',
    COIN: '<:gold_donator:1053256617518440478>',
    BOMB: '💣',
    MONEY: '<:Money:1051978255827222590>',
    ERROR: '<:naoJEFF:1109179756831854592>'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mines")
        .setDescription("「💰」Jogue o jogo do mines")
        .setDescriptionLocalizations({
            'en-US': '「💰」Play the mines game',
            'en-GB': '「💰」Play the mines game',
        })
        .setDMPermission(false)
        .addNumberOption(option => 
            option
                .setName("valor")
                .setNameLocalizations({
                    'en-US': 'amount',
                    'en-GB': 'amount',
                })
                .setDescription("Qual valor que você irá apostar?")
                .setDescriptionLocalizations({
                    'en-US': 'How much do you want to bet?',
                    'en-GB': 'How much do you want to bet?',
                })
                .setMinValue(GAME_CONFIG.MIN_BET)
                .setRequired(true)
        ),

    async execute(interaction, client) {
        try {
            // Verify/create user data
            const verify_lunar = await LunarModel.findOne({ user_id: interaction.user.id });
            if (!verify_lunar) {
                await LunarModel.create({ 
                    user_id: interaction.user.id, 
                    coins: 0, 
                    isVip: false, 
                    prompts_used: 0, 
                    language: 'pt-BR', 
                    image_prompts_used: 0 
                });
            }

            const valor = interaction.options.getNumber('valor');
            
            // Initial validations
            const [daily, lunar, transactions] = await Promise.all([
                dailyCollect.findOne({ user_id: interaction.user.id }),
                LunarModel.findOne({ user_id: interaction.user.id }),
                transactionsModel.findOne({ user_id: interaction.user.id })
            ]);

            const userLanguage = lunar.language;

            if (!daily?.daily_collected) {
                return interaction.reply({ 
                    content: i18next.t('mines.needDaily', { 
                        lng: userLanguage,
                        emoji: EMOJIS.ERROR 
                    }),
                    flags: MessageFlags.Ephemeral 
                });
            }

            if (!lunar || lunar.coins < valor) {
                return interaction.reply({ 
                    content: i18next.t('mines.insufficientFunds', { 
                        lng: userLanguage,
                        emoji: EMOJIS.ERROR 
                    }),
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Deduct initial bet
            lunar.coins -= Math.floor(valor);
            await lunar.save();

            // Initialize game
            const gameState = {
                multiply: GAME_CONFIG.INITIAL_MULTIPLIER,
                minesPositions: generateMinesPositions(),
                revealedPositions: new Set(),
                isGameOver: false,
                userLanguage
            };

            const buttonGrid = createInitialGrid(gameState.minesPositions);
            const embed = createGameEmbed(client, valor, gameState.multiply, false, false, userLanguage);

            const message = await interaction.reply({ 
                embeds: [embed], 
                components: buttonGrid,
                fetchReply: true
            });

            // Setup interaction collector
            const collector = message.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id
            });

            collector.on('collect', async (int) => {
                await handleButtonClick(int, message, gameState, valor, lunar, transactions, client);
            });

        } catch (error) {
            console.error('Error in Mines game:', error);
            return interaction.reply({ 
                content: i18next.t('mines.error', { 
                    lng: lunar?.language || 'pt-BR'
                }),
                flags: MessageFlags.Ephemeral 
            });
        }
    }
};

function generateMinesPositions() {
    const positions = new Set();
    while (positions.size < GAME_CONFIG.TOTAL_MINES) {
        const pos = `${Math.floor(Math.random() * GAME_CONFIG.GRID_SIZE)}-${Math.floor(Math.random() * GAME_CONFIG.GRID_SIZE)}`;
        positions.add(pos);
    }
    return positions;
}

function createInitialGrid(minesPositions) {
    const grid = [];
    
    for (let i = 0; i < GAME_CONFIG.GRID_SIZE; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < GAME_CONFIG.GRID_SIZE; j++) {
            const isMine = minesPositions.has(`${i}-${j}`);
            const button = new ButtonBuilder()
                .setCustomId(`cell-${i}-${j}-${isMine}`)
                .setLabel(' ')
                .setEmoji(EMOJIS.BOX)
                .setStyle('Primary');
            row.addComponents(button);
        }
        grid.push(row);
    }

    const finalizeRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('finalize')
                .setLabel('Finalizar jogo')
                .setEmoji(EMOJIS.COIN)
                .setStyle('Success')
        );
    grid.push(finalizeRow);

    return grid;
}

function createGameEmbed(client, valor, multiplier, gameOver = false, won = false, language) {
    const gains = Math.floor(valor * multiplier);
    
    const description = i18next.t(
        gameOver 
            ? won 
                ? 'mines.embedWon'
                : 'mines.embedLost'
            : 'mines.embedOngoing',
        {
            lng: language,
            multiplier: multiplier.toFixed(2),
            coins: gains,
            bet: valor,
            coin: EMOJIS.COIN,
            money: EMOJIS.MONEY,
            error: EMOJIS.ERROR
            
        }
    );

    return new EmbedBuilder()
        .setTitle(i18next.t('mines.embedTitle', { 
            lng: language,
            botName: client.user.username 
        }))
        .setColor("#be00e8")
        .setDescription(description);
}

async function handleButtonClick(interaction, message, gameState, valor, lunar, transactions, client) {
    await interaction.deferUpdate();

    if (gameState.isGameOver) return;

    const isFinalize = interaction.customId === 'finalize';
    const [type, row, col, isMine] = interaction.customId.split('-');

    if (isFinalize) {
        await handleGameEnd(true, message, gameState, valor, lunar, transactions, client);
        return;
    }

    if (type !== 'cell') return;

    const position = `${row}-${col}`;
    
    if (gameState.revealedPositions.has(position)) return;
    
    if (isMine === 'true') {
        await handleGameEnd(false, message, gameState, valor, lunar, transactions, client);
        return;
    }

    gameState.revealedPositions.add(position);
    gameState.multiply += GAME_CONFIG.MULTIPLIER_INCREMENT;

    const updatedGrid = createUpdatedGrid(gameState);
    const updatedEmbed = createGameEmbed(client, valor, gameState.multiply, false, false, gameState.userLanguage);

    await message.edit({
        embeds: [updatedEmbed],
        components: updatedGrid
    });
}

async function handleGameEnd(won, message, gameState, valor, lunar, transactions, client) {
    gameState.isGameOver = true;
    
    if (won) {
        const winAmount = Math.floor(valor * gameState.multiply);
        lunar.coins += winAmount;
        await lunar.save();
    }

    const transactionData = {
        id: Math.floor(Math.random() * (999999999 - 111111111 + 1) + 111111111),
        timestamp: Math.floor(Date.now() / 1000),
        mensagem: i18next.t(
            won ? 'mines.transactionWon' : 'mines.transactionLost',
            {
                lng: gameState.userLanguage,
                amount: won ? Math.floor(valor * gameState.multiply) : valor
            }
        )
    };

    if (!transactions) {
        await transactionsModel.create({
            user_id: message.interaction.user.id,
            transactions: [transactionData],
            transactions_ids: [transactionData.id]
        });
    } else {
        transactions.transactions.push(transactionData);
        transactions.transactions_ids.push(transactionData.id);
        await transactions.save();
    }

    const finalGrid = createFinalGrid(gameState.minesPositions, gameState.revealedPositions, gameState);
    const finalEmbed = createGameEmbed(client, valor, gameState.multiply, true, won, gameState.userLanguage);

    await message.edit({
        embeds: [finalEmbed],
        components: finalGrid
    });
}

function createUpdatedGrid(gameState) {
    const grid = [];
    
    for (let i = 0; i < GAME_CONFIG.GRID_SIZE; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < GAME_CONFIG.GRID_SIZE; j++) {
            const position = `${i}-${j}`;
            const isMine = gameState.minesPositions.has(position);
            const isRevealed = gameState.revealedPositions.has(position);
            
            const button = new ButtonBuilder()
                .setCustomId(`cell-${i}-${j}-${isMine}`)
                .setLabel(' ')
                .setEmoji(isRevealed ? EMOJIS.COIN : EMOJIS.BOX)
                .setStyle(isRevealed ? 'Secondary' : 'Primary')
                .setDisabled(isRevealed);
            
            row.addComponents(button);
        }
        grid.push(row);
    }

    const finalizeRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('finalize')
                .setLabel(i18next.t('mines.finalizeButton', { lng: gameState.userLanguage }))
                .setEmoji(EMOJIS.COIN)
                .setStyle('Success')
        );
    grid.push(finalizeRow);
    
    return grid;
}

function createFinalGrid(minesPositions, revealedPositions, gameState) {
    const grid = [];
    
    for (let i = 0; i < GAME_CONFIG.GRID_SIZE; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < GAME_CONFIG.GRID_SIZE; j++) {
            const position = `${i}-${j}`;
            const isMine = minesPositions.has(position);
            
            const button = new ButtonBuilder()
                .setCustomId(`cell-${i}-${j}`)
                .setLabel(' ')
                .setEmoji(isMine ? EMOJIS.BOMB : EMOJIS.COIN)
                .setStyle(isMine ? 'Danger' : 'Secondary')
                .setDisabled(true);
            
            row.addComponents(button);
        }
        grid.push(row);
    }

    const finalizeRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('finalize')
                .setLabel(i18next.t('mines.finalizeButton', { lng: gameState.userLanguage }))
                .setEmoji(EMOJIS.COIN)
                .setStyle('Success')
                .setDisabled(true)
        );
    grid.push(finalizeRow);
    
    return grid;
}