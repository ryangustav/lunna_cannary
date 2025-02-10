const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const LunarModel = require('../../database/schema/coins_database.js');
const path = require('path');
const i18next = require('i18next');

try {
    registerFont(path.join(__dirname, '../../assets/fonts/Montserrat-Bold.ttf'), { family: 'Montserrat' });
    registerFont(path.join(__dirname, '../../assets/fonts/NotoColorEmoji-Regular.ttf'), { family: 'Noto Color Emoji' });
} catch (error) {
    console.error('Error loading font:', error);
}

const userCache = new Map();

// Função auxiliar para desenhar retângulos arredondados
function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

// Função auxiliar para buscar banner do usuário
async function getUserBanner(userId) {
    try {
        const response = await fetch(`https://discord.com/api/v10/users/${userId}`, {
            headers: {
                Authorization: `Bot ${process.env.TOKEN}`
            }
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (data.banner) {
            return `https://cdn.discordapp.com/banners/${userId}/${data.banner}?size=2048&format=png`;
        }

        if (data.accent_color) {
            const canvas = createCanvas(1000, 300);
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            const hexColor = '#' + data.accent_color.toString(16).padStart(6, '0');
            gradient.addColorStop(0, hexColor);
            gradient.addColorStop(1, '#000000');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            return canvas.toBuffer();
        }

        return null;
    } catch (error) {
        console.error('Error fetching banner:', error);
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top')
        .setDescription('「📊」Mostra o top 10 usuários com mais coins')
        .setDescriptionLocalizations({
            'en-US': '「📊」Show top 10 users with most coins',
            'en-GB': '「📊」Show top 10 users with most coins'
        }),

    async execute(interaction, client) {
        await interaction.deferReply();

        try {
            const topUsers = await LunarModel.find({ 
                user_id: { $ne: null },
                coins: { $exists: true, $ne: null }
            })
                .sort({ coins: -1 })
                .limit(10)
                .lean()
                .catch(error => {
                    console.error('Database query error:', error);
                    throw new Error('Failed to fetch leaderboard data');
                });

            if (!topUsers?.length) {
                return await interaction.editReply({
                    content: i18next.t('leaderboard.no_data', { 
                        lng: interaction.locale || 'pt-BR',
                        defaultValue: 'No leaderboard data available.'
                    })
                });
            }

            const canvas = createCanvas(800, 600);
            const ctx = canvas.getContext('2d');

     
            ctx.shadowColor = 'rgba(0, 0, 0, 4)';
            ctx.shadowBlur = 5;
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 45px Montserrat';
            ctx.textAlign = 'center';
            ctx.fillText('Top 10 Lunnar Coins', canvas.width / 2, 60);
            ctx.shadowBlur = 0;
            ctx.textAlign = 'left';

           
            for (let i = 0; i < topUsers.length; i++) {
                const y = 120 + (i * 80);
                const userId = topUsers[i].user_id;

                try {
                    let userData = userCache.get(userId);
                    
                    if (!userData || Date.now() - userData.timestamp > 3600000) {
                        const user = await client.users.fetch(`${userId}`);
                        const avatarURL = user.displayAvatarURL({ extension: 'png', size: 128 });
                        const bannerData = await getUserBanner(userId);
                        
                        let bannerImage = null;
                        
                        if (bannerData) {
                            if (Buffer.isBuffer(bannerData)) {
                                bannerImage = await loadImage(bannerData);
                            } else {
                                bannerImage = await loadImage(bannerData);
                            }
                        }
                        
                        userData = {
                            username: user.username,
                            avatar: await loadImage(avatarURL),
                            banner: bannerImage,
                            timestamp: Date.now()
                        };
                        userCache.set(userId, userData);
                    }

                    
                    const entryHeight = 70;
                    const rectX = 20;
                    const rectY = y - 10;
                    const rectWidth = canvas.width - 40;
                    const rectHeight = entryHeight;
                    const borderRadius = 15;
                    let gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
                    gradient.addColorStop(2, '#18002466');
                    gradient.addColorStop(1, "#15002488");
                    gradient.addColorStop(0, "#06000aFF");


                    ctx.fillStyle = gradient;
                    drawRoundedRect(ctx, rectX, rectY, rectWidth, rectHeight, borderRadius);

                   
                    ctx.save();
                    ctx.beginPath();
                    const avatarSize = 60;
                    const avatarX = 80;
                    const avatarY = y - 5;
                    ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(userData.avatar, avatarX, avatarY, avatarSize, avatarSize);
                    ctx.restore();

                    
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                    ctx.shadowBlur = 4;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 30px Montserrat';
                    const position = i + 1;
                    ctx.fillText(`#${position}`, 30, y + 35);

                   
                    const username = userData.username || 'Unknown User';
                    const truncatedUsername = username.length > 20 ? username.slice(0, 17) + '...' : username;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 28px Montserrat';
                    ctx.fillText(truncatedUsername, 160, y + 25);

                 
                    ctx.fillStyle = '#ffa621';
                    ctx.font = 'bold 24px Montserrat';
                    ctx.fillText(`${topUsers[i].coins.toLocaleString()} Lunnar coins`, 160, y + 55);
                    ctx.shadowBlur = 0;

                } catch (userError) {
                    console.error(`Error processing user ${userId}:`, userError);
                }
            }

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { 
                name: 'leaderboard.png',
                description: 'Rank Global de Sonhos'
            });

            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Error in leaderboard command:', error);
            await interaction.editReply({
                content: 'An error occurred while generating the leaderboard.',
                ephemeral: true
            });
        }
    }
};
