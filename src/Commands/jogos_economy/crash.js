const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const LunarModel = require("../../database/schema/coins_database.js");
const dailyCollect = require('../../database/schema/daily_schema.js');
const transactionsModel = require('../../database/schema/transactions.js');
const Canvas = require('canvas');
const i18next = require('i18next');

const GAME_CONFIG = {
    MIN_BET: 50,
    MAX_MULTIPLIER: 100,
    UPDATE_INTERVAL: 1500,
    CRASH_PROBABILITY: 0.10,
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 400,
    ROCKET_SIZE: 30,
    EMOJIS: {
        MONEY: '<:Money:1051978255827222590>',
        ERROR: '<:naoJEFF:1109179756831854592>',
        ROCKET: '🚀',
        BOOM: '💥',
        CHART: '📈'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("crash")
        .setDescription("「💰」Jogue Crash e multiplique suas moedas")
        .setDescriptionLocalizations({
            'en-US': '「💰」Play Crash and multiply your coins',
            'en-GB': '「💰」Play Crash and multiply your coins',
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
                    'pt-BR': 'Qual valor você quer apostar?',
                })
                .setMinValue(GAME_CONFIG.MIN_BET)
                .setRequired(true)
        ),

    async execute(interaction, client) {
        await interaction.deferReply();

        try {
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

            const betAmount = interaction.options.getNumber('value');
            const user_data = await LunarModel.findOne({ user_id: interaction.user.id });
            const userLanguage = user_data?.language || 'pt-BR';
            
            const validationResult = await validateGame(interaction, betAmount, userLanguage);

            if (!validationResult.success) {
                return interaction.editReply(validationResult.response);
            }

            const { lunar } = validationResult;

            lunar.coins -= Math.floor(betAmount);
            await lunar.save();

            const gameState = {
                multiplier: 1.00,
                crashed: false,
                collected: false,
                betAmount,
                lunar,
                startTime: Date.now(),
                language: userLanguage
            };

            const message = await interaction.editReply({
                embeds: [await createGameEmbed(client, gameState)],
                components: createGameComponents(false, userLanguage),
                files: [await createCrashCanvas(gameState.multiplier, false)]
            });

            startGameLoop(message, gameState, client);

        } catch (error) {
            console.error('Error in Crash Game:', error);
            return interaction.editReply({
                content: i18next.t('crash.error', { lng: userLanguage || 'pt-BR' }),
                ephemeral: true
            });
        }
    }
};

async function validateGame(interaction, betAmount, language) {
    const [daily, lunar] = await Promise.all([
        dailyCollect.findOne({ user_id: interaction.user.id }),
        LunarModel.findOne({ user_id: interaction.user.id })
    ]);

    if (!daily?.daily_collected) {
        return {
            success: false,
            response: {
                content: i18next.t('crash.needDaily', { 
                    error: GAME_CONFIG.EMOJIS.ERROR,
                    lng: language 
                }),
                ephemeral: true
            }
        };
    }

    if (!lunar || lunar.coins < betAmount) {
        return {
            success: false,
            response: {
                content: i18next.t('crash.insufficientCoins', { lng: language }),
                ephemeral: true
            }
        };
    }

    return { success: true, lunar };
}

function createGameEmbed(client, gameState, attachment) {
    const { multiplier, crashed, collected, betAmount, language } = gameState;
    const potentialWin = Math.floor(betAmount * multiplier);
    
    let description = crashed 
    ? i18next.t('crash.crashedAt', { 
        boom: GAME_CONFIG.EMOJIS.BOOM,
        multiplier: multiplier.toFixed(2), 
        lng: language 
    })
    : i18next.t('crash.currentMultiplier', { 
        rocket: GAME_CONFIG.EMOJIS.ROCKET,
        multiplier: multiplier.toFixed(2), 
        lng: language 
    });

description += i18next.t('crash.betInfo', { 
    money: GAME_CONFIG.EMOJIS.MONEY,
    chart: GAME_CONFIG.EMOJIS.CHART,
    betAmount,
    potentialWin,
    lng: language 
});
    
    if (collected) {
        description += i18next.t('crash.collected', { amount: potentialWin, lng: language });
    } else if (crashed) {
        description += i18next.t('crash.lost', { amount: betAmount, lng: language });
    }

    return new EmbedBuilder()
        .setTitle(`${client.user.username} | Crash Game`)
        .setColor(crashed ? "#ff0000" : collected ? "#00ff00" : "#be00e8")
        .setDescription(description)
        .setImage('attachment://crash.png');
}

function createGameComponents(disabled = false, language) {
    return [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('collect')
                    .setLabel(i18next.t('crash.collectButton', { lng: language }))
                    .setEmoji('💰')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(disabled)
            )
    ];
}

async function createCrashCanvas(multiplier, crashed) {
    const canvas = Canvas.createCanvas(GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    const ctx = canvas.getContext('2d');


    ctx.fillStyle = '#2f3136';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

 
    ctx.strokeStyle = '#ffffff33';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }


    const progress = crashed ? Math.min(multiplier, GAME_CONFIG.MAX_MULTIPLIER) : multiplier;
    const normalizedProgress = Math.min((progress - 1) / 4, 1);
    
    const rocketX = normalizedProgress * (canvas.width - GAME_CONFIG.ROCKET_SIZE);
    const rocketY = canvas.height - (normalizedProgress * (canvas.height - GAME_CONFIG.ROCKET_SIZE));


    ctx.beginPath();
    ctx.strokeStyle = crashed ? '#ff4444' : '#9000FF';
    ctx.lineWidth = 3;
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(rocketX + GAME_CONFIG.ROCKET_SIZE/2, rocketY + GAME_CONFIG.ROCKET_SIZE/2);
    ctx.stroke();


    ctx.save();
    ctx.translate(rocketX + GAME_CONFIG.ROCKET_SIZE/2, rocketY + GAME_CONFIG.ROCKET_SIZE/2);
    
    if (crashed) {

        const explosionSize = GAME_CONFIG.ROCKET_SIZE;
        

        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(0, 0, explosionSize/3, 0, Math.PI * 2);
        ctx.fill();


        const numRays = 8;
        const innerRadius = explosionSize/3;
        const outerRadius = explosionSize/1.5;
        
        ctx.fillStyle = '#ff6666';
        for (let i = 0; i < numRays; i++) {
            const angle = (i * 2 * Math.PI) / numRays;
            const nextAngle = ((i + 1) * 2 * Math.PI) / numRays;
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(
                Math.cos(angle) * outerRadius,
                Math.sin(angle) * outerRadius
            );
            ctx.lineTo(
                Math.cos(nextAngle) * outerRadius,
                Math.sin(nextAngle) * outerRadius
            );
            ctx.closePath();
            ctx.fill();
        }

     
        ctx.fillStyle = '#ff8888';
        const numParticles = 6;
        for (let i = 0; i < numParticles; i++) {
            const angle = (i * 2 * Math.PI) / numParticles;
            const x = Math.cos(angle) * (outerRadius + explosionSize/4);
            const y = Math.sin(angle) * (outerRadius + explosionSize/4);
            
            ctx.beginPath();
            ctx.arc(x, y, explosionSize/8, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
     
        ctx.rotate(Math.PI/4);
        const rocketColor = '#9000FF';
        const rocketSize = GAME_CONFIG.ROCKET_SIZE;
        
      
        ctx.fillStyle = rocketColor;
        ctx.beginPath();
        ctx.moveTo(-rocketSize/4, -rocketSize/2);
        ctx.lineTo(rocketSize/4, -rocketSize/2);
        ctx.lineTo(rocketSize/4, rocketSize/2);
        ctx.lineTo(-rocketSize/4, rocketSize/2);
        ctx.closePath();
        ctx.fill();

        
        ctx.beginPath();
        ctx.moveTo(-rocketSize/4, -rocketSize/2);
        ctx.lineTo(0, -rocketSize/1.5);
        ctx.lineTo(rocketSize/4, -rocketSize/2);
        ctx.closePath();
        ctx.fill();

       
        ctx.beginPath();
        ctx.moveTo(-rocketSize/4, rocketSize/2);
        ctx.lineTo(-rocketSize/2, rocketSize/2 + rocketSize/4);
        ctx.lineTo(-rocketSize/4, rocketSize/2);
        ctx.moveTo(rocketSize/4, rocketSize/2);
        ctx.lineTo(rocketSize/2, rocketSize/2 + rocketSize/4);
        ctx.lineTo(rocketSize/4, rocketSize/2);
        ctx.fill();

        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -rocketSize/6, rocketSize/8, 0, Math.PI * 2);
        ctx.fill();

        const fireColors = ['#ff4400', '#ff6b00', '#ff9900'];
        fireColors.forEach((color, index) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(-rocketSize/4 + (index * rocketSize/8), rocketSize/2);
            ctx.lineTo(0, rocketSize/2 + rocketSize/2);
            ctx.lineTo(rocketSize/4 - (index * rocketSize/8), rocketSize/2);
            ctx.closePath();
            ctx.fill();
        });
    }

    ctx.restore();


    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Arial';
    ctx.fillText(`${progress.toFixed(2)}x`, 10, 30);

    return new AttachmentBuilder(canvas.toBuffer(), { name: 'crash.png' });
}

async function startGameLoop(message, gameState, client) {
    const collector = message.createMessageComponentCollector({
        time: 5 * 60 * 1000
    });

    collector.on('collect', async (interaction) => {
        if (interaction.customId === 'collect' && !gameState.crashed && !gameState.collected) {
            gameState.collected = true;
            const winAmount = Math.floor(gameState.betAmount * gameState.multiplier);
            
            gameState.lunar.coins += winAmount;
            await gameState.lunar.save();
            await registerTransaction(gameState.lunar.user_id, winAmount);
            
            const attachment = await createCrashCanvas(gameState.multiplier, false);
            await interaction.update({
                embeds: [createGameEmbed(client, gameState)],
                files: [attachment],
                components: createGameComponents(true)
            });
            
            collector.stop();
        }
    });

    const gameLoop = setInterval(async () => {
        if (gameState.crashed || gameState.collected) {
            clearInterval(gameLoop);
            return;
        }

        if (Math.random() < GAME_CONFIG.CRASH_PROBABILITY * (gameState.multiplier / 2)) {
            gameState.crashed = true;
            const attachment = await createCrashCanvas(gameState.multiplier, true);
            await message.edit({
                embeds: [createGameEmbed(client, gameState)],
                files: [attachment],
                components: createGameComponents(true)
            });
            clearInterval(gameLoop);
            return;
        }

        gameState.multiplier += 0.05;
        
        if (gameState.multiplier >= GAME_CONFIG.MAX_MULTIPLIER) {
            gameState.crashed = true;
            const attachment = await createCrashCanvas(gameState.multiplier, true);
            await message.edit({
                embeds: [createGameEmbed(client, gameState)],
                files: [attachment],
                components: createGameComponents(true)
            });
            clearInterval(gameLoop);
            return;
        }

        const attachment = await createCrashCanvas(gameState.multiplier, false);
        await message.edit({
            embeds: [createGameEmbed(client, gameState)],
            files: [attachment],
            components: createGameComponents(false)
        });
    }, GAME_CONFIG.UPDATE_INTERVAL);

    collector.on('end', () => {
        clearInterval(gameLoop);
        if (!gameState.collected && !gameState.crashed) {
            gameState.crashed = true;
            message.edit({
                embeds: [createGameEmbed(client, gameState)],
                components: createGameComponents(true)
            });
        }
    });
}


async function registerTransaction(userId, amount) {
    const user_data = await LunarModel.findOne({ user_id: userId });
    const userLanguage = user_data?.language || 'pt-BR';
    const transactionData = {
        id: Math.floor(Math.random() * (999999999 - 111111111 + 1) + 111111111),
        timestamp: Math.floor(Date.now() / 1000),
        mensagem: i18next.t('crash.won', { amount: amount, lng: userLanguage })
    };

    await transactionsModel.findOneAndUpdate(
        { user_id: userId },
        {
            $push: {
                transactions: transactionData,
                transactions_ids: transactionData.id
            }
        },
        { upsert: true }
    );
}