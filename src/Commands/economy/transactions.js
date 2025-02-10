const { SlashCommandBuilder } = require("discord.js");
const LunarModel = require("../../database/schema/coins_database.js");
const transactionsModel = require('../../database/schema/transactions.js');
const Discord = require("discord.js");
const i18next = require('i18next');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("transactions")
    .setDescription("「💰」Veja suas transações")
    .setDescriptionLocalizations(
      { 
        'en-US': '「💰」View your transactions',
        'en-GB': '「💰」View your transactions',
      }
)
    .setDMPermission(false)
    .addNumberOption(option => 
      option
        .setName("pagina")
        .setNameLocalizations({
          'en-US': 'page',
          'en-GB': 'page'
        })
        .setDescription("Qual página você quer visualizar")
        .setDescriptionLocalizations(
          { 
            'en-US': 'Which page do you want to view?',
            'en-GB': 'Which page do you want to view?',
          }
    )
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const transactions = await transactionsModel.findOne({ user_id: interaction.user.id });
    const user = await LunarModel.findOne({ user_id: interaction.user.id })
    let userLanguage = user.language || 'pt';


    if (!transactions || !transactions.transactions.length) {
      return interaction.reply({ content: i18next.t(`transactions.no_transactions`, { 
        lng: userLanguage 
    }), ephemeral: true });
    }

    const transactionsPerPage = 10; 
    const totalPages = Math.ceil(transactions.transactions.length / transactionsPerPage);
    let currentPage = interaction.options.getNumber("pagina") || 1;

    if (currentPage < 1 || currentPage > totalPages) {
      return interaction.reply({ content: i18next.t(`transactions.invalid_pages`, { 
        totalPages: totalPages,
        lng: userLanguage 
    }), ephemeral: true });
    }

    const generateTransactionList = (page) => {
      const startIndex = (page - 1) * transactionsPerPage;
      const endIndex = Math.min(page * transactionsPerPage, transactions.transactions.length);
      return transactions.transactions.slice(startIndex, endIndex).map(t => 
        `[ <t:${Math.floor(t.timestamp)}:d> <t:${Math.floor(t.timestamp)}:t> | <t:${Math.floor(t.timestamp)}:R> ] ${t.mensagem}`
      ).join("\n") || i18next.t(`transactions.no_transactions`, { 
        ping: client.ws.ping,
        lng: userLanguage 
    });
    };

    const updateEmbed = (page) => {
      return new Discord.EmbedBuilder()
        .setTitle(i18next.t(`transactions.title`, { 
          username: interaction.user.username,
          page: page,
          totalPages: totalPages,
          lng: userLanguage 
      }))
        .setColor("#be00e8")
        .setDescription(generateTransactionList(page))
        .setFooter({ text: i18next.t(`transactions.footer`, { 
          transactions: transactions.transactions.length,
          lng: userLanguage 
      }) });
    };

    const embed = updateEmbed(currentPage);

    const buttonRow = new Discord.ActionRowBuilder().addComponents(
      new Discord.ButtonBuilder()
        .setCustomId('prev_page')
        .setLabel(' ')
        .setEmoji('<:world_setae:1000602510706343936>')
        .setStyle(Discord.ButtonStyle.Primary)
        .setDisabled(currentPage === 1),
      new Discord.ButtonBuilder()
        .setCustomId('next_page')
        .setLabel(' ')
        .setEmoji('<:world_setad:1000602463272976425>')
        .setStyle(Discord.ButtonStyle.Primary)
        .setDisabled(currentPage === totalPages)
    );

    const message = await interaction.reply({ embeds: [embed], components: [buttonRow], fetchReply: true }); 

    const buttonCollector = message.createMessageComponentCollector({ time: 60000 }); 

    buttonCollector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        const user_but = await LunarModel.findOne({ user_id: buttonInteraction.user.id })
        let userButLanguage = user_but.language || 'pt';
        
        return buttonInteraction.reply({ content: i18next.t(`transactions.no_interact`, { 
          lng: userButLanguage 
      }), ephemeral: true });
      }

      await buttonInteraction.deferUpdate();

      if (buttonInteraction.customId === 'prev_page' && currentPage > 1) {
        currentPage--;
      } else if (buttonInteraction.customId === 'next_page' && currentPage < totalPages) {
        currentPage++;
      }

      const updatedEmbed = updateEmbed(currentPage);
      const updatedButtonRow = new Discord.ActionRowBuilder().addComponents(
        new Discord.ButtonBuilder()
          .setCustomId('prev_page')
          .setLabel(' ')
          .setEmoji('<:world_setae:1000602510706343936>')
          .setStyle(Discord.ButtonStyle.Primary)
          .setDisabled(currentPage === 1),
        new Discord.ButtonBuilder()
          .setCustomId('next_page')
          .setLabel(' ')
          .setEmoji('<:world_setad:1000602463272976425>')
          .setStyle(Discord.ButtonStyle.Primary)
          .setDisabled(currentPage === totalPages)
      );

      await buttonInteraction.editReply({ embeds: [updatedEmbed], components: [updatedButtonRow] });
    });

    buttonCollector.on('end', () => {
      const disabledRow = new Discord.ActionRowBuilder().addComponents(
        new Discord.ButtonBuilder()
          .setCustomId('prev_page')
          .setLabel(' ')
          .setEmoji('<:world_setae:1000602510706343936>')
          .setStyle(Discord.ButtonStyle.Primary)
          .setDisabled(true),
        new Discord.ButtonBuilder()
          .setCustomId('next_page')
          .setLabel(' ')
          .setEmoji('<:world_setad:1000602463272976425>')
          .setStyle(Discord.ButtonStyle.Primary)
          .setDisabled(true)
      );

      message.edit({ components: [disabledRow] });
    });
  },
};
