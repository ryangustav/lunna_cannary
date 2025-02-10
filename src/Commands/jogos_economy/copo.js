const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const LunarModel = require("../../database/schema/coins_database.js");
const dailyCollect = require('../../database/schema/daily_schema.js');
const transactionsModel = require('../../database/schema/transactions.js');
const i18next = require('i18next');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("copo")
        .setDescription("「💰」Jogue o jogo do copo")
        .setNameLocalizations({
            'en-US': 'cup',
            'en-GB': 'cup'
        })
        .setDescriptionLocalizations({
            'en-US': '「💰」Play the cup game',
            'en-GB': '「💰」Play the cup game'
        })
        .setDMPermission(false)
        .addNumberOption(option => 
            option
            .setName("valor")
            .setDescription("Qual valor que você ira apostar?")
            .setNameLocalizations({
                'en-US': 'value',
                'en-GB': 'value'
            })
            .setDescriptionLocalizations({
                'en-US': 'How much do you want to bet?',
                'en-GB': 'How much do you want to bet?'
            })
            .setRequired(true)
        ),
    async execute(interaction, client) {
        const valor = interaction.options.getNumber('valor');
        const daily = await dailyCollect.findOne({ user_id: interaction.user.id });
        const lunar = await LunarModel.findOne({ user_id: interaction.user.id });
        const transactions_payer = await transactionsModel.findOne({ user_id: interaction.user.id });
        const id = Math.floor(Math.random() * (999999999 - 111111111 + 1) + 111111111);
        const timestamp = Math.floor(Date.now() / 1000);
        const userLanguage = lunar?.language || 'pt';
        
        // Validações iniciais
        if (!daily?.daily_collected) {
            return interaction.reply({ 
                content: i18next.t('copo.errors.needDaily', { lng: userLanguage }),
                flags: MessageFlags.Ephemeral 
            });
        }
        if (!lunar || lunar.coins < valor) {
            return interaction.reply({ 
                content: i18next.t('copo.errors.insufficientFunds', { lng: userLanguage }),
                flags: MessageFlags.Ephemeral 
            });
        }
        if (valor < 50) {
            return interaction.reply({ 
                content: i18next.t('copo.errors.minBet', { lng: userLanguage }),
                flags: MessageFlags.Ephemeral 
            });
        }
        
        lunar.coins -= Math.floor(valor);
        await lunar.save();

        const copos = [];
        const ids = [];
        let bolinha = false;
        const bolinhas = {
            bolinha0: '<:soda:1239315444163149865>',
            bolinha1: '<:soda:1239315444163149865>',
            bolinha2: '<:soda:1239315444163149865>'
        };

        // Lógica do jogo
        for (let i = 0; i < 3; i++) {
            const cup_random = Math.floor(Math.random() * 3);
            if (cup_random === 2 && !bolinha) {
                bolinha = true;
                copos.push(true);
            } else if (i === 2 && !bolinha) {
                copos.push(true);
            } else {
                copos.push(false);
            }
            ids.push(`bolinha${i}-${copos[i]}`);
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`bolinha0-${copos[0]}`)
                    .setLabel('1')
                    .setStyle('Primary'),
                new ButtonBuilder()
                    .setCustomId(`bolinha1-${copos[1]}`)
                    .setLabel('2')
                    .setStyle('Primary'),
                new ButtonBuilder()
                    .setCustomId(`bolinha2-${copos[2]}`)
                    .setLabel('3')
                    .setStyle('Primary')
            );

        const embed = new EmbedBuilder()
            .setTitle(`${client.user.username} | ${i18next.t('copo.game.title', { lng: userLanguage })}`)
            .setColor('#be00e8')
            .setDescription(`
${i18next.t('copo.game.question', { lng: userLanguage })}
> ${bolinhas.bolinha0} ${bolinhas.bolinha1} ${bolinhas.bolinha2}
            `);

        const message = await interaction.channel.send({ embeds: [embed], components: [row] });
        const collector = message.channel.createMessageComponentCollector();

        collector.on('collect', async (int) => {
            if (int.message.id !== message.id || int.user.id !== interaction.user.id) return;
            
            const trues = int.customId.split('-');
            let bolinhas_string = '';
            const disabledRow = createDisabledButtons(copos);

            if (trues[1] === 'true') {
                // Jogador ganhou
                bolinhas_string = copos.map(isTrue => isTrue ? '⚾' : '<:soda:1239315444163149865>').join('');
                await handleWin(message, client, valor, bolinhas_string, userLanguage, lunar, transactions_payer, id, timestamp, disabledRow);
            } else {
                // Jogador perdeu
                let resposta;
                if (trues[0] === 'bolinha0') resposta = 1;
                if (trues[0] === 'bolinha1') resposta = 2;
                if (trues[0] === 'bolinha2') resposta = 3;

                const copo_certo = copos.findIndex(isTrue => isTrue) + 1;
                bolinhas_string = copos.map(isTrue => isTrue ? '⚾' : '<:soda:1239315444163149865>').join('');
                
                await handleLoss(message, client, valor, bolinhas_string, copo_certo, resposta, userLanguage, transactions_payer, id, timestamp, disabledRow);
            }
        });
    }
};

function createDisabledButtons(copos) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`bolinha0-${copos[0]}`)
                .setLabel('1')
                .setDisabled(true)
                .setStyle('Primary'),
            new ButtonBuilder()
                .setCustomId(`bolinha1-${copos[1]}`)
                .setLabel('2')
                .setDisabled(true)
                .setStyle('Primary'),
            new ButtonBuilder()
                .setCustomId(`bolinha2-${copos[2]}`)
                .setLabel('3')
                .setDisabled(true)
                .setStyle('Primary')
        );
}

async function handleWin(message, client, valor, bolinhas_string, userLanguage, lunar, transactions_payer, id, timestamp, disabledRow) {
    const winAmount = valor * 2;
    
    // Atualizar transações
    if (!transactions_payer) {
        await transactionsModel.create({
            user_id: message.interaction.user.id,
            transactions: [{
                id,
                timestamp,
                mensagem: i18next.t('copo.game.win.transaction', { amount: winAmount, lng: userLanguage })
            }],
            transactions_ids: [id]
        });
    } else {
        transactions_payer.transactions.push({
            id,
            timestamp,
            mensagem: i18next.t('copo.game.win.transaction', { amount: winAmount, lng: userLanguage })
        });
        transactions_payer.transactions_ids.push(id);
        await transactions_payer.save();
    }

    // Atualizar saldo
    lunar.coins += Math.floor(winAmount);
    await lunar.save();

    // Atualizar mensagem
    const embed = new EmbedBuilder()
        .setTitle(`${client.user.username} | ${i18next.t('copo.game.title', { lng: userLanguage })}`)
        .setColor('#be00e8')
        .setDescription(`
${i18next.t('copo.game.win.title', { lng: userLanguage })}
> ${bolinhas_string}
${i18next.t('copo.game.win.betValue', { value: valor, lng: userLanguage })}
${i18next.t('copo.game.win.earnings', { amount: winAmount, lng: userLanguage })}
        `);

    await message.edit({ embeds: [embed], components: [disabledRow] });
}

async function handleLoss(message, client, valor, bolinhas_string, copo_certo, resposta, userLanguage, transactions_payer, id, timestamp, disabledRow) {
    // Atualizar transações
    if (!transactions_payer) {
        await transactionsModel.create({
            user_id: message.interaction.user.id,
            transactions: [{
                id,
                timestamp,
                mensagem: i18next.t('copo.game.lose.transaction', { amount: valor, lng: userLanguage })
            }],
            transactions_ids: [id]
        });
    } else {
        transactions_payer.transactions.push({
            id,
            timestamp,
            mensagem: i18next.t('copo.game.lose.transaction', { amount: valor, lng: userLanguage })
        });
        transactions_payer.transactions_ids.push(id);
        await transactions_payer.save();
    }

    // Atualizar mensagem
    const embed = new EmbedBuilder()
        .setTitle(`${client.user.username} | ${i18next.t('copo.game.title', { lng: userLanguage })}`)
        .setColor('#be00e8')
        .setDescription(`
${i18next.t('copo.game.lose.title', { lng: userLanguage })}
> ${bolinhas_string}
${i18next.t('copo.game.lose.rightCup', { cup: copo_certo, lng: userLanguage })}
${i18next.t('copo.game.lose.yourAnswer', { answer: resposta, lng: userLanguage })}
${i18next.t('copo.game.lose.losses', { amount: valor, lng: userLanguage })}
        `);

    await message.edit({ embeds: [embed], components: [disabledRow] });
}