const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const word = require('@andsfonseca/palavras-pt-br').Word;
const LunarModel = require("../../database/schema/coins_database.js");
const i18next = require('i18next');
const fs = require('fs').promises;
const path = require('path');


module.exports = {
    data: new SlashCommandBuilder()
        .setName("forca")
        .setNameLocalizations({
            'en-US': "hangman",
            'en-GB': 'hangman',
        })
        .setDescription("「🎉」Jogue o jogo da forca!")
        .setDescriptionLocalizations({
            'en-US': '「🎉」Play hangman game!',
            'en-GB': '「🎉」Play hangman game!'
        })
        .setDMPermission(false),
    async execute(interaction, client) {
        const lunnar_coins = await LunarModel.findOne({ user_id: interaction.user.id });
        const userLanguage = lunnar_coins.language || 'pt';
        let isEnglish = userLanguage === 'en';
        
        let gameWord;
        if (isEnglish) {
            const wordsFile = await fs.readFile(path.join(__dirname, '../../words', 'english.txt'), 'utf8');
            const words = wordsFile.split('\n').filter(word => word.trim());
            gameWord = words[Math.floor(Math.random() * words.length)].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();;
        } else {
            gameWord = word.getRandomWord().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();;
        }
        gameWord = gameWord.trim();
        let wordArray = gameWord.trim().split('');
        let displayWord = '-'.repeat(wordArray.length);
        let wrongLetters = [];
        const maxAttempts = 6;

        const createEmbed = (displayWord, wrongLetters, gameOver = false, won = false) => {
            const embed = new EmbedBuilder()
                .setTitle(i18next.t('hangman.title', { lng: userLanguage }))
                .setColor('#be00e8')
                .setDescription(i18next.t('hangman.description', {
                    letterCount: wordArray.length,
                    word: displayWord,
                    lng: userLanguage
                }))
                .setFooter({ text: i18next.t('hangman.footer', { lng: userLanguage }) })
                .addFields({
                    name: i18next.t('hangman.wrongLetters', { lng: userLanguage }),
                    value: `${wrongLetters.join(' ')} (${wrongLetters.length}/${maxAttempts})`
                });

            if (gameOver) {
                embed.addFields({
                    name: won ? 
                        i18next.t('hangman.won', { lng: userLanguage }) :
                        i18next.t('hangman.lost', { lng: userLanguage }),
                    value: won ? ' ' : `${i18next.t('hangman.correctWord', { word: gameWord, lng: userLanguage })}`
                });
            }

            return embed;
        };

        const createButtons = (disabled = false) => {
            return new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('guessLetter')
                        .setLabel(i18next.t('hangman.guessLetter', { lng: userLanguage }))
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(disabled),
                    new ButtonBuilder()
                        .setCustomId('guessWord')
                        .setLabel(i18next.t('hangman.guessWord', { lng: userLanguage }))
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(disabled)
                );
        };

        const checkLetter = (letter) => {
            let found = false;
            const normalizedLetter = letter.toLowerCase();
            const displayArray = displayWord.split('');

            wordArray.forEach((char, index) => {
                const normalizedChar = char.normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toLowerCase();
                
                if (normalizedChar === normalizedLetter) {
                    displayArray[index] = char;
                    found = true;
                }
            });

            if (found) {
                displayWord = displayArray.join('');
                return true;
            }
            return false;
        };

        const checkWord = (guess) => {
            const normalizedGuess = guess.normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();
            const normalizedWord = gameWord.normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();
            
            return normalizedGuess === normalizedWord;
        };

        
        const gameMessage = await interaction.reply({
            embeds: [createEmbed(displayWord, wrongLetters)],
            components: [createButtons()],
            fetchReply: true
        });

        
        const collector = gameMessage.createMessageComponentCollector({
            time: 300000 
        });

        collector.on('collect', async (int) => {
            if (int.message.id !== gameMessage.id) return;

            if (int.customId === 'guessLetter') {
                const modal = new ModalBuilder()
                    .setCustomId('letterModal')
                    .setTitle(i18next.t('hangman.modalTitle', { lng: userLanguage }))
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('letter')
                                .setLabel(i18next.t('hangman.enterLetter', { lng: userLanguage }))
                                .setStyle(TextInputStyle.Short)
                                .setMaxLength(1)
                                .setMinLength(1)
                                .setRequired(true)
                        )
                    );

                await int.showModal(modal);
            } else if (int.customId === 'guessWord') {
                const modal = new ModalBuilder()
                    .setCustomId('wordModal')
                    .setTitle(i18next.t('hangman.modalTitle', { lng: userLanguage }))
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('word')
                                .setLabel(i18next.t('hangman.enterWord', { lng: userLanguage }))
                                .setStyle(TextInputStyle.Short)
                                .setMaxLength(30)
                                .setRequired(true)
                        )
                    );

                await int.showModal(modal);
            }
        });

        
        client.on('interactionCreate', async (int) => {
            if (!int.isModalSubmit()) return;
            if (int.message?.id !== gameMessage.id) return;

            await int.deferUpdate();

            if (int.customId === 'letterModal') {
                const letter = int.fields.getTextInputValue('letter');
                
                if (!checkLetter(letter)) {
                    wrongLetters.push(letter);
                }

                const gameOver = wrongLetters.length >= maxAttempts;
                const won = !displayWord.includes('-');

                await gameMessage.edit({
                    embeds: [createEmbed(displayWord, wrongLetters, gameOver || won, won)],
                    components: [createButtons(gameOver || won)]
                });

            } else if (int.customId === 'wordModal') {
                const guessedWord = int.fields.getTextInputValue('word');
                const won = checkWord(guessedWord);

                if (won) {
                    displayWord = gameWord;
                } else {
                    wrongLetters.push(guessedWord);
                }

                const gameOver = !won && wrongLetters.length >= maxAttempts;

                await gameMessage.edit({
                    embeds: [createEmbed(displayWord, wrongLetters, true, won)],
                    components: [createButtons(true)]
                });
            }
        });
    },
};