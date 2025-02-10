const RifaModel = require('../database/schema/rifas_schema.js');
const RifaUserModel = require('../database/schema/rifa_user_schema.js');
const LunarModel = require('../database/schema/coins_database.js');
const i18next = require('i18next');

const RIFA_CONFIG = {
    PRICE: 100,
    INTERVAL: 3600000, // 1 hora em milissegundos
    CHANNEL_ID: "1326249589581283411"
};

class RifaDrawSystem {
    constructor(client) {
        this.client = client;
        this.running = false;
        this.timeout = null;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.schedule();
    }

    stop() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        this.running = false;
    }

    schedule() {
        const now = new Date();
        const nextDraw = new Date(now);
        nextDraw.setHours(nextDraw.getHours() + 1);
        nextDraw.setMinutes(0);
        nextDraw.setSeconds(0);
        nextDraw.setMilliseconds(0);

        const delay = nextDraw.getTime() - now.getTime();
        this.timeout = setTimeout(() => this.draw(), delay);
    }

    async draw() {
        try {
            const rifaData = await RifaModel.findOne({});
            if (!rifaData?.rifa_user?.length) {
                this.schedule();
                return;
            }

            const winnerIndex = Math.floor(Math.random() * rifaData.rifa_user.length);
            const winner = rifaData.rifa_user[winnerIndex];
            const prize = rifaData.rifa_user.length * RIFA_CONFIG.PRICE * 1.50;

            // Atualizar saldo do vencedor
            await LunarModel.findOneAndUpdate(
                { user_id: winner.user_id },
                { $inc: { coins: prize } },
                { new: true }
            );

            // Buscar usuário e enviar DM
            try {
                const user = await this.client.users.fetch(winner.user_id);
                if (user) {
                    const dm = await user.createDM();
                    await dm.send(i18next.t('rifa.winner_announcement', {
                        user: user.username,
                        prize,
                        total_tickets: rifaData.rifa_user.length,
                        lng: 'pt-BR'
                    }));
                }
            } catch (error) {
                console.error('Failed to send DM to winner:', error);
            }

            // Anunciar no canal
            try {
                const channel = await this.client.channels.fetch(RIFA_CONFIG.CHANNEL_ID);
                
                if (channel) {
                    await channel.send({
                        content: [
                            `🎉 Parabéns <@${winner.user_id}>! Venceu o sorteio das rifas.`,
                            `📊 Tivemos ${rifaData.rifa_user.length} rifas vendidas`,
                            `💰 Premio: ${prize} lunnar coins\n`,
                            `🎉 Congratulations <@${winner.user_id}>!`,
                            `📊 We had ${rifaData.rifa_user.length} raffle tickets sold`,
                            `💰 Prize: ${prize} lunnar coins`
                        ].join('\n')
                    });
                }
            } catch (error) {
                console.error('Failed to send announcement:', error);
            }
            const user = await this.client.users.fetch(winner.user_id);
            // Limpar rifas
            await Promise.all([
                RifaModel.updateOne({}, { rifa_user: [], last_rifa_prize: prize, rifa_winner: winner.user_id, rifa_winner_username: user.displayName }),
                RifaUserModel.updateMany({}, { rifa_user: [] })
            ]);

        } catch (error) {
            console.error('Error in raffle draw:', error);
        } finally {
            this.schedule();
        }
    }
}

module.exports = RifaDrawSystem;