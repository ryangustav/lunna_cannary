const { ActionRowBuilder, ButtonBuilder, MessageFlags } = require('discord.js');
const LunarModel = require("../../database/schema/coins_database.js");
const BanModel = require("../../database/schema/banned_user.js");
const generative = require("../../util/IA-generative.js");

// Constants
const TYPING_INTERVAL = 5000;
const ERROR_TIMEOUT = 15000;
const MODERATION_CHANNEL = '1240122114090995792';
const LIMITS = {
    FREE: 60,
    VIP: 160
};

class MessageHandler {

    static async initializeUser(userId) {
        const [user, ban] = await Promise.all([
            LunarModel.findOne({ user_id: userId }),
            BanModel.findOne({ user_id: userId })
        ]);

        if (!user) await LunarModel.create({ user_id: userId, coins: 0, isVip: false, prompts_used: 0 });
        if (!ban) await BanModel.create({ user_id: userId, isBanned: false, prompts_sexuais: 0 });

        return {
            user: await LunarModel.findOne({ user_id: userId }),
            ban: await BanModel.findOne({ user_id: userId })
        };
    }

    static createBanButton(userId) {
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Banir da IA')
                    .setStyle('Primary')
                    .setEmoji('<a:ban_ban:1239710558249422879>')
                    .setCustomId(`bania-${userId}`)
            );
    }

    static async handleSafetyViolation(message, client, ban) {
        ban.prompts_sexuais += 1;
        await ban.save();

        const moderationChannel = client.channels.cache.get(MODERATION_CHANNEL);
        await moderationChannel.send({
            content: `⚠️ | O usuario ${message.author.username} (\`${message.author.id}\`) Foi pego tentando usar prompts sexuais/gore!`,
            components: [this.createBanButton(message.author.id)]
        });

        return 'Sou uma IA com base em texto, então não consigo te ajudar com isso. 😊';
    }

    static validateMessage(message, client) {
        const mentionedUser = message.mentions.users.first();
        
        return mentionedUser && 
               !message.author.bot && 
               mentionedUser.id === client.user.id &&
               message.content.startsWith(mentionedUser);
    }

    static getPrompt(message) {
        const args = message.content.trim().split(/ +/g);
        return args.slice(1).join(' ');
    }

    static async execute(message, client) {
        if (!this.validateMessage(message, client)) return;

        const prompt = this.getPrompt(message);
        if (!prompt) return;


          // Initialize typing indicator and error timeout
          const sendTypingInterval = setInterval(() => message.channel.sendTyping(), TYPING_INTERVAL);
        const errorTimeout = setTimeout(() => {
            message.reply({ 
                content: '⚠️ Ocorreu um erro desconhecido ao gerar sua resposta - O seu limite de prompts para hoje pode ter sido atingido.',
                 flags: MessageFlags.Ephemeral
            });
            clearInterval(sendTypingInterval);
        }, ERROR_TIMEOUT);

        try {
             // Initialize or get user data
            const { user, ban } = await this.initializeUser(message.author.id);

            // Check restrictions
            if (ban.isBanned) {
                return message.reply({ 
                    content: '<:moderator:1238705467883126865> | Você está banido! Não podera usar meus comandos. Para contextar o banimento entre em [meu servidor](https://em-breve.xyz/)'
                });
            }

            const promptLimit = user.isVip ? LIMITS.VIP : LIMITS.FREE;
            if (user.prompts_used >= promptLimit) {
                return message.reply({ 
                    content: `<:naoJEFF:1109179756831854592> | Você atingiu o limite de prompts ${user.isVip ? 'vip' : 'gratis'} diario`
                });
            }

            // Generate response
            let response = await generative(prompt, message.author.id);

            // Handle special cases
            if (response.toString().includes('Candidate was blocked due to SAFETY')) {
                response = await this.handleSafetyViolation(message, client, ban);
            } else if (response.toString().includes('[GoogleGenerativeAI Error]') || 
                      response.toString().includes('TypeError: response.text is not a function')) {
                response = 'Sou uma IA com base em texto, então não consigo te ajudar com isso. 😊';
            }

            // Update user stats
            user.prompts_used += 1;
            await user.save();

            // Send response
            await message.reply({ content: response });

        } catch (error) {
            console.error('Error in message handling:', error);
            await message.reply({ 
                content: 'Ocorreu um erro ao processar sua mensagem. Por favor, tente novamente mais tarde.',
                 flags: MessageFlags.Ephemeral 
            });
        } finally {
            clearInterval(sendTypingInterval);
            clearTimeout(errorTimeout);
        }
    }
}

module.exports = {
    name: "messageCreate",
    execute: (message, client) => MessageHandler.execute(message, client)
};