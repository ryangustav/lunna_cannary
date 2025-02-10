const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, MessageFlags, ButtonStyle, EmbedBuilder } = require("discord.js");
const LunarModel = require("../../database/schema/coins_database.js");
const generative = require(`../../util/IA-generative.js`);
const bania = require("../../database/schema/banned_user.js");
const i18next = require('i18next');

const LIMITS = {
    FREE_PROMPTS: 60,
    VIP_PROMPTS: 160,
    TYPING_INTERVAL: 5000,
    TIMEOUT: 10000
};

const CHANNELS = {
    MODERATION: '1240122114090995792'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("lunna")
        .setDescription("「🎉」Pergunte algo a minha IA")
        .setDescriptionLocalizations({
            'en-US': '「🎉」Ask my AI something',
            'en-GB': '「🎉」Ask my AI something'
        })
        .setDMPermission(false)
        .addStringOption(option => 
            option
                .setName('prompt')
                .setDescription('Oque você quer perguntar?')
                .setDescriptionLocalizations({
                    'en-US': 'What do you want to ask?',
                    'en-GB': 'What do you want to ask?'
                })
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const lunnar_coins = await LunarModel.findOne({ user_id: interaction.user.id });
        const userLanguage = lunnar_coins.language || 'pt';
        try {
            
            const [user, ban] = await initializeUserData(interaction.user.id);

            
            const checkResult = await checkUserStatus(interaction, user, ban);
            if (checkResult) return;

            
            const { sendTypingInterval, timeoutId } = setupIntervals(interaction);

           
            
            const response = await processResponse(interaction, client, user, ban);

           
            await updateUserPrompts(user);

           
            clearInterval(sendTypingInterval);
            clearTimeout(timeoutId);

            await interaction.reply({ 
                content: i18next.t(`prompt.await`, { lng: userLanguage }) 
            });


            await interaction.editReply({ content: response });

        } catch (error) {
            console.error('Error in Lunna command:', error);
            await interaction.editReply({ 
                content: i18next.t(`prompt.error`, { lng: userLanguage }),
                flags: MessageFlags.Ephemeral 
            });
        }
    },
};


async function initializeUserData(userId) {
    const [user, ban] = await Promise.all([
        LunarModel.findOne({ user_id: userId }),
        bania.findOne({ user_id: userId })
    ]);

    const createPromises = [];

    if (!user) {
        createPromises.push(
            LunarModel.create({ 
                user_id: userId, 
                coins: 0, 
                isVip: false, 
                prompts_used: 0 
            })
        );
    }

    if (!ban) {
        createPromises.push(
            bania.create({ 
                user_id: userId, 
                isBanned: false, 
                prompts_sexuais: 0 
            })
        );
    }

    if (createPromises.length > 0) {
        await Promise.all(createPromises);
        return Promise.all([
            LunarModel.findOne({ user_id: userId }),
            bania.findOne({ user_id: userId })
        ]);
    }

    return [user, ban];
}

async function checkUserStatus(interaction, user, ban) {
    if (ban.isBanned) {
        await interaction.editReply({ 
            content: i18next.t(`prompt.user_banned`, { lng: userLanguage }) 
        });
        return true;
    }

    const promptLimit = user.isVip ? LIMITS.VIP_PROMPTS : LIMITS.FREE_PROMPTS;
    if (user.prompts_used >= promptLimit) {
        const message = user.isVip ? 
        i18next.t(`prompt.vip_diary_prompts`, { lng: userLanguage })  : 
        i18next.t(`prompt.free_diary_prompts`, { lng: userLanguage }) ;
        
        await interaction.editReply({ 
            content: `<:naoJEFF:1109179756831854592> | ${message}`
        });
        return true;
    }

    return false;
}

function setupIntervals(interaction) {
    const sendTypingInterval = setInterval(() => {
        interaction.channel.sendTyping();
    }, LIMITS.TYPING_INTERVAL);

    const timeoutId = setTimeout(() => {
        interaction.editReply({ 
            content: i18next.t(`prompt.response_error`, { lng: userLanguage }) ,
            flags: MessageFlags.Ephemeral
        });
        clearInterval(sendTypingInterval);
    }, LIMITS.TIMEOUT);

    return { sendTypingInterval, timeoutId };
}

async function processResponse(interaction, client, user, ban) {
    const prompt = interaction.options.getString('prompt');
    let response = await generative(prompt, interaction.user.id);

    if (response.toString().includes('Candidate was blocked due to SAFETY')) {
        await handleInappropriateContent(interaction, client, ban);
        response = i18next.t(`prompt.text_based_ai`, { lng: userLanguage }) ;
    }

    if (response.toString().includes('[GoogleGenerativeAI Error]')) {
        response = i18next.t(`prompt.text_based_ai`, { lng: userLanguage }) ;
    }

    return response;
}

async function handleInappropriateContent(interaction, client, ban) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel(`Banir da IA`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('<a:ban_ban:1239710558249422879>')
                .setCustomId(`bania-${interaction.user.id}`)
        );

    ban.prompts_sexuais += 1;
    await ban.save();

    const moderationChannel = client.channels.cache.get(CHANNELS.MODERATION);
    if (moderationChannel) {
        await moderationChannel.send({ 
            content: `⚠️ | O usuario ${interaction.user.username} (\`${interaction.user.id}\`) Foi pego tentando usar prompts sexuais/gore!`,
            components: [row]
        });
    }
}

async function updateUserPrompts(user) {
    user.prompts_used += 1;
    await user.save();
}