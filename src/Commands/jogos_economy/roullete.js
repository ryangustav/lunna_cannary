const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const RouletteManager = require('../../util/RoulleteManager.js');
const dailyCollect = require('../../database/schema/daily_schema.js');
const LunarModel = require("../../database/schema/coins_database.js");
const i18next = require('i18next');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("roulette")
        .setDescription("「💰」Jogue roleta")
        .setDescriptionLocalizations({
            'en-US': '「💰」Play roulette',
            'en-GB': '「💰」Play roulette',
        })
        .setDMPermission(false)
        .addNumberOption(option => 
            option
                .setName("value")
                .setNameLocalizations({
                    'pt-BR': 'valor',
                })
                .setDescription("How much do you want to bet?")
                .setDescriptionLocalizations({
                    'pt-BR': "Qual valor que você irá apostar?",
                })
                .setRequired(true)
        )
        .addStringOption(option => 
            option
                .setName("bet")
                .setNameLocalizations({
                    'pt-BR': 'aposta',
                })
                .setDescription("What's your bet?")
                .setDescriptionLocalizations({
                    'pt-BR': "Qual sua aposta?",
                })
                .addChoices(
                    { 
                        name: 'Black',
                        name_localizations: {
                            'pt-BR': 'Preto'
                        },
                        value: 'black'
                    },
                    { 
                        name: 'Red',
                        name_localizations: {
                            'pt-BR': 'Vermelho'
                        },
                        value: 'red'
                    },
                    { 
                        name: 'Odd',
                        name_localizations: {
                            'pt-BR': 'Impares'
                        },
                        value: 'impares'
                    },
                    { 
                        name: 'Even',
                        name_localizations: {
                            'pt-BR': 'Pares'
                        },
                        value: 'pares'
                    },
                    { name: '1-12', value: '1-12'},
                    { name: '13-24', value: '13-24'},
                    { name: '25-36', value: '25-36'},
                )
                .setRequired(true)
        ),

    async execute(interaction, client) {
        // Initialize user data if not exists
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

        const channelId = interaction.channelId;
        const valor = interaction.options.getNumber('value');
        const aposta = interaction.options.getString('bet');
        
        // Get user language
        const user_data = await LunarModel.findOne({ user_id: interaction.user.id });
        const userLanguage = user_data?.language || 'pt-BR';
        
        // Initial checks
        const [daily, lunar] = await Promise.all([
            dailyCollect.findOne({ user_id: interaction.user.id }),
            LunarModel.findOne({ user_id: interaction.user.id })
        ]);

        if (!daily?.daily_collected) {
            return interaction.reply({ 
                content: i18next.t('roulette.needDaily', {
                    error: '<:naoJEFF:1109179756831854592>',
                    lng: userLanguage
                })
            });
        }

        if (!lunar || lunar.coins < valor) {
            return interaction.reply({ 
                content: i18next.t('roulette.insufficientCoins', {
                    error: '<:naoJEFF:1109179756831854592>',
                    lng: userLanguage
                })
            });
        }

        if (valor < RouletteManager.minBet) {
            return interaction.reply({ 
                content: i18next.t('roulette.minBet', {
                    error: '<:naoJEFF:1109179756831854592>',
                    minBet: RouletteManager.minBet,
                    lng: userLanguage
                })
            });
        }

        lunar.coins -= Math.floor(valor);
        await lunar.save();

        let game;
        const hasActiveGame = await RouletteManager.hasActiveGame(channelId);

        if (!hasActiveGame) {
            game = await RouletteManager.createGame(channelId, interaction.user.id, valor, aposta);
            
            setTimeout(async () => {
                const completedGame = await RouletteManager.endGame(channelId);
                if (!completedGame) return;
        
                const { result } = completedGame;
                
                const resultsEmbed = new EmbedBuilder()
                    .setTitle(i18next.t('roulette.resultTitle', {
                        botName: client.user.username,
                        lng: userLanguage
                    }))
                    .setColor('#be00e8')
                    .setDescription(i18next.t('roulette.resultDescription', {
                        number: result.number,
                        colorEmoji: result.color === 'red' ? '🔴' : '⚫',
                        color: result.color,
                        parityEmoji: result.parity === 'pares' ? '2️⃣' : '1️⃣',
                        parity: result.parity,
                        section: result.section,
                        totalPot: result.total_pot.toLocaleString(),
                        houseFee: Math.floor(result.house_fee).toLocaleString(),
                        winners: result.winners.length > 0 
                            ? result.winners.map(w => i18next.t('roulette.winnerEntry', {
                                userId: w.user_id,
                                betType: w.bet_type,
                                amount: w.amount.toLocaleString(),
                                winnings: w.winnings.toLocaleString(),
                                lng: userLanguage
                              })).join('\n\n')
                            : i18next.t('roulette.noWinners', { lng: userLanguage }),
                        lng: userLanguage
                    }));
                
                interaction.channel.send({ embeds: [resultsEmbed] });
            }, 30000);
        } else {
            game = await RouletteManager.addPlayerToGame(channelId, interaction.user.id, valor, aposta);
        }

        if (!game) {
            return interaction.reply({ 
                content: i18next.t('roulette.gameError', {
                    error: '<:naoJEFF:1109179756831854592>',
                    lng: userLanguage
                })
            });
        }

        const timeLeft = Math.ceil((game.end_time - new Date()) / 1000);
        const currentPot = game.players.reduce((sum, player) => sum + player.amount, 0);

        const gameEmbed = new EmbedBuilder()
            .setTitle(i18next.t('roulette.gameTitle', {
                botName: client.user.username,
                lng: userLanguage
            }))
            .setColor('#be00e8')
            .setDescription(i18next.t('roulette.gameDescription', {
                user: `<@${interaction.user.id}>`,
                amount: valor,
                bet: aposta,
                timeLeft,
                currentPot,
                lng: userLanguage
            }));

        interaction.reply({ embeds: [gameEmbed] });
    }
};