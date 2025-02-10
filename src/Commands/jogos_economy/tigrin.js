const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const LunarModel = require("../../database/schema/coins_database.js");
const i18next = require('i18next');

// Game configuration
const GAME_CONFIG = {
    MIN_BET: 50,
    SPIN_DURATION: 2000,
    SPIN_INTERVAL: 300,
    MULTIPLIERS: {
        SPECIAL_ROLE: 10.00,
        GOLD_DONATOR: 5.00,
        OTHER: 1.25,
        DEFAULT: 1.00
    }
};

// Game symbols and emojis
const EMOJIS = {
    SPINNING_SYMBOLS: ['🎰', '💎', '7️⃣', '🎲'],
    MONEY: '<:Money:1051978255827222590>',
    ERROR: '<:naoJEFF:1109179756831854592>',
    SPECIAL_ROLE: '<:SpecialRoles:1055063301148639252>',
    GOLD_DONATOR: '<:gold_donator:1053256617518440478>',
    FRUITS: ['🍎', '🍐', '🍇']
};

const SYMBOLS_POOL = [
    { symbol: EMOJIS.SPECIAL_ROLE, weight: 1 },
    { symbol: EMOJIS.GOLD_DONATOR, weight: 2 },
    ...EMOJIS.FRUITS.map(fruit => ({ symbol: fruit, weight: 3 }))
];

const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tigrin")
        .setNameLocalizations({
            'en-US': "slot",
            'en-GB': "slot"
        })
        .setDescription("「💰」Jogue o jogo do tigrinho")
        .setDescriptionLocalizations({
            'en-US': '「💰」Play the slot machine game',
            'en-GB': '「💰」Play the slot machine game',
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
                    'en-US': 'How much would you like to bet?',
                    'en-GB': 'How much would you like to bet?',
                })
                .setMinValue(GAME_CONFIG.MIN_BET)
                .setRequired(true)
        ),

    async execute(interaction, client) {
        if (!client) {
            throw new Error('Client is required');
        }

        await interaction.deferReply();
        
        try {
            const betAmount = interaction.options.getNumber('valor');
            const lunar = await LunarModel.findOne({ user_id: interaction.user.id });
            const userLanguage = lunar?.language || 'pt-BR';
            
            if (!lunar || lunar.coins < betAmount) {
                return interaction.editReply({
                    content: i18next.t('tigrin.insufficient_funds', { lng: userLanguage }),
                    flags: MessageFlags.Ephemeral
                });
            }

            // Deduct initial bet
            lunar.coins -= Math.floor(betAmount);
            await lunar.save();

            const gameResult = await playGame(interaction, client, betAmount);
            
            // Update user's coins with winnings
            if (gameResult.winAmount > 0) {
                lunar.coins += gameResult.winAmount;
                await lunar.save();
            }

            await showResult(interaction, client, gameResult, userLanguage);

        } catch (error) {
            console.error('Error in Tigrin game:', error);
            return interaction.editReply({
                content: i18next.t('tigrin.error', { lng: 'pt-BR' }),
                flags: MessageFlags.Ephemeral
            });
        }
    }
};

async function playGame(interaction, client, betAmount) {
    const spinningAnimation = createSpinningAnimation(client);
    const message = await interaction.editReply({ embeds: [spinningAnimation] });

    // Spin animation
    const spins = Math.floor(GAME_CONFIG.SPIN_DURATION / GAME_CONFIG.SPIN_INTERVAL);
    for (let i = 0; i < spins; i++) {
        await new Promise(resolve => setTimeout(resolve, GAME_CONFIG.SPIN_INTERVAL));
        await message.edit({ 
            embeds: [createSpinningAnimation(client)]
        }).catch(console.error);
    }

    return generateGameResult(betAmount);
}

function createSpinningAnimation(client) {
    const spinningSymbol = EMOJIS.SPINNING_SYMBOLS[Math.floor(Math.random() * EMOJIS.SPINNING_SYMBOLS.length)];
    const spinningBoard = Array(9).fill(spinningSymbol);
    
    return new EmbedBuilder()
        .setTitle(`${client.user.username} | Tigrin Game 🎰`)
        .setColor("#be00e8")
        .setDescription(`
${EMOJIS.MONEY} | ${i18next.t('tigrin.spinning', { lng: 'pt-BR' })}
↘️=====↙️
${spinningBoard.slice(0, 3).join(' ')}
${spinningBoard.slice(3, 6).join(' ')}
${spinningBoard.slice(6, 9).join(' ')}
↗️=====↖️`);
}

function generateGameResult(betAmount) {
    const board = Array(9).fill(null).map(() => {
        const totalWeight = SYMBOLS_POOL.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const item of SYMBOLS_POOL) {
            random -= item.weight;
            if (random <= 0) return item.symbol;
        }
        return SYMBOLS_POOL[0].symbol;
    });

    const winningLines = WINNING_COMBINATIONS.filter(combo => {
        const [a, b, c] = combo;
        return board[a] === board[b] && board[b] === board[c];
    });

    const multiplier = calculateMultiplier(board, winningLines);
    const winAmount = Math.floor(betAmount * multiplier);

    return { board, winningLines, multiplier, winAmount };
}

function calculateMultiplier(board, winningLines) {
    if (winningLines.length === 0) return 0;

    const winningSymbol = board[winningLines[0][0]];
    const baseMultiplier = {
        [EMOJIS.SPECIAL_ROLE]: GAME_CONFIG.MULTIPLIERS.SPECIAL_ROLE,
        [EMOJIS.GOLD_DONATOR]: GAME_CONFIG.MULTIPLIERS.GOLD_DONATOR
    }[winningSymbol] || GAME_CONFIG.MULTIPLIERS.OTHER;

    return baseMultiplier * winningLines.length;
}

async function showResult(interaction, client, gameResult, language) {
    const { board, winningLines, multiplier, winAmount } = gameResult;

    const boardDisplay = board.map((symbol, index) => {
        const isWinning = winningLines.some(line => line.includes(index));
        return isWinning ? `**${symbol}**` : symbol;
    });

    const resultEmbed = new EmbedBuilder()
        .setTitle(`${client.user.username} | Tigrin Game 🎰`)
        .setColor("#be00e8")
        .setDescription(i18next.t('tigrin.result', {
            winAmount,
            multiplier: multiplier.toFixed(2),
            board: `${boardDisplay.slice(0, 3).join(' ')}\n${boardDisplay.slice(3, 6).join(' ')}\n${boardDisplay.slice(6).join(' ')}`,
            lng: language
        }));

    await interaction.editReply({ embeds: [resultEmbed] });
}
