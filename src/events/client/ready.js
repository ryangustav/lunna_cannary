// ready.js
const { ActivityType } = require('discord.js');

module.exports = {
    name: 'ready',
    async execute(client) {
        // logs principais
        console.log(`[LOG] Estou online na aplicação: ${client.user.username}`);
        console.log(`[LOG] Tenho ${client.users.cache.size} lunnarians em ${client.guilds.cache.size} servidores`)
        
        // status do bot
        const textoStatus = '💸 Se divirta comigo';
        client.user.setActivity(textoStatus, {
            type: ActivityType.Custom
        });
        client.user.setStatus('idle');
    },
};