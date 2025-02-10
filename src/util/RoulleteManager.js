const RouletteGame = require('../database/schema/roulette_games.js');
const LunarModel = require("../database/schema/coins_database.js");
const transactionsModel = require("../database/schema/transactions.js");
const i18next = require('i18next');

class RouletteManager {
    constructor() {
        this.minBet = 50;
        this.houseFee = 0.02;
        this.multipliers = {
            color: 1.50,
            parity: 1.25,
            section: 2.00
        };
    }

    async hasActiveGame(channelId) {
        const activeGame = await RouletteGame.findOne({
            channel_id: channelId,
            status: 'active'
        });
        return activeGame !== null;
    }

    async createGame(channelId, userId, amount, betType) {
        const endTime = new Date(Date.now() + 30000);
        
        const game = new RouletteGame({
            channel_id: channelId,
            start_time: new Date(),
            end_time: endTime,
            players: [{
                user_id: userId,
                amount,
                bet_type: betType,
                timestamp: new Date()
            }]
        });

        await game.save();
        return game;
    }

    async addPlayerToGame(channelId, userId, amount, betType) {
        const game = await RouletteGame.findOne({
            channel_id: channelId,
            status: 'active'
        });

        if (!game) return null;

        game.players.push({
            user_id: userId,
            amount,
            bet_type: betType,
            timestamp: new Date()
        });

        await game.save();
        return game;
    }

    async endGame(channelId) {
        const game = await RouletteGame.findOne({
            channel_id: channelId,
            status: 'active'
        });
    
        if (!game) return null;
    
        const number = Math.floor(Math.random() * 36) + 1;
        const results = {
            number,
            color: number % 2 === 0 ? 'red' : 'black',
            parity: number % 2 === 0 ? 'pares' : 'impares',
            section: number <= 12 ? '1-12' : number <= 24 ? '13-24' : '25-36',
            winners: [],
            losers: []
        };
    
        const totalPot = game.players.reduce((sum, player) => sum + player.amount, 0);
        const houseAmount = totalPot * this.houseFee;
        const winningPot = totalPot - houseAmount;

        // Processa cada jogador uma única vez
        for (const player of game.players) {
            const won = this.checkWin(player.bet_type, results);
            const multiplier = this.getMultiplier(player.bet_type);
            
            if (won) {
                const winnings = (player.amount * multiplier) + (winningPot / game.players.length);
                results.winners.push({
                    user_id: player.user_id,
                    amount: player.amount,
                    winnings: Math.floor(winnings),
                    bet_type: player.bet_type
                });
                await this.updatePlayerWin(player.user_id, winnings, player.amount);
            } else {
                results.losers.push({
                    user_id: player.user_id,
                    amount: player.amount,
                    bet_type: player.bet_type
                });
                await this.updatePlayerLoss(player.user_id, player.amount);
            }
        }
    
        game.status = 'completed';
        game.result = {
            ...results,
            total_pot: totalPot,
            house_fee: houseAmount
        };
        await game.save();
    
        return game;
    }

    checkWin(betType, results) {
        return betType === results.color || 
               betType === results.parity || 
               betType === results.section;
    }

    getMultiplier(betType) {
        if (betType === 'black' || betType === 'red') return this.multipliers.color;
        if (betType === 'pares' || betType === 'impares') return this.multipliers.parity;
        return this.multipliers.section;
    }

    async updatePlayerWin(userId, winnings, betAmount) {
        const lunar = await LunarModel.findOne({ user_id: userId });
        const userLanguage = lunar?.language || 'pt-BR';
        const id = Math.floor(Math.random() * (999999999 - 111111111 + 1) + 111111111);
        
        lunar.coins += Math.floor(winnings);
        await lunar.save();

        await this.createTransaction(userId, id, i18next.t(`roulette.transactionWon`, { 
            winnings: winnings,
            betAmount: betAmount,
            lng: userLanguage 
        }));
    }

    async updatePlayerLoss(userId, amount) {
        const user_data = await LunarModel.findOne({ user_id: userId });
        const userLanguage = user_data?.language || 'pt-BR';
        const id = Math.floor(Math.random() * (999999999 - 111111111 + 1) + 111111111);
        await this.createTransaction(userId, id, i18next.t(`roulette.transactionLost`, { 
            amount: amount,
            lng: userLanguage 
        }));
    }

    async createTransaction(userId, id, message) {
        const transaction = await transactionsModel.findOne({ user_id: userId });


        if (!transaction) {
            await transactionsModel.create({
                user_id: userId,
                transactions: [{ 
                    id, 
                    timestamp: Math.floor(Date.now() / 1000), 
                    mensagem: message 
                }],
                transactions_ids: [id]
            });
        } else {
            transaction.transactions.push({
                id,
                timestamp: Math.floor(Date.now() / 1000),
                mensagem: message
            });
            transaction.transactions_ids.push(id);
            await transaction.save();
        }
    }
}

module.exports = new RouletteManager();