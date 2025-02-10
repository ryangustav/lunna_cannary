const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const LunarModel = require("../../database/schema/coins_database.js");
const BanModel = require("../../database/schema/banned_user.js");
const { createProdia } = require('prodia');
const translate = require('translate-google');
const i18next = require('i18next');

// Configurações
const PRODIA_API_KEY = "69eddfe6-114b-41c3-8781-393bef804a89";
const LIMITS = {
  FREE: 3,
  VIP: 10
};

const STYLE_CHOICES = [
  { name: '3d', value: '3d-model' },
  { name: 'film', value: 'analog-film' },
  { name: 'anime', value: 'anime' },
  { name: 'cinematic', value: 'cinematic' },
  { name: 'comic', value: 'comic-book' },
  { name: 'digital', value: 'digital-art' },
  { name: 'enhance', value: 'enhance' },
  { name: 'fantasy', value: 'fantasy-art' },
  { name: 'isometric', value: 'isometric' },
  { name: 'line', value: 'line-art' },
  { name: 'lowpoly', value: 'low-poly' },
  { name: 'neonpunk', value: 'neon-punk' },
  { name: 'origami', value: 'origami' },
  { name: 'photographic', value: 'photographic' },
  { name: 'pixel', value: 'pixel-art' },
  { name: 'texture', value: 'texture' },
  { name: 'clay', value: 'craft-clay' }
];

const prodia = createProdia({ apiKey: PRODIA_API_KEY });

module.exports = {
  data: new SlashCommandBuilder()
    .setName("imagine")
    .setDescription("「🎉」Faça-me imaginar uma imagem")
    .setDescriptionLocalizations({
      'en-US': '「🎉」Make me imagine an image',
      'en-GB': '「🎉」Make me imagine an image'
  })
    .setDMPermission(false)
    .setNSFW(true)
    .addStringOption(option => 
      option
        .setName('prompt')
        .setDescription('O que você quer que eu faça?')
        .setDescriptionLocalizations({
          'en-US': 'What do you want me to do?',
          'en-GB': 'What do you want me to do?'
      })
        .setRequired(true)
    )
    .addStringOption(option => 
      option
        .setName('style')
        .setDescription('Qual estilo de arte que você quer')
        .setDescriptionLocalizations({
          'en-US': 'What style of art do you want?',
          'en-GB': 'What style of art do you want?'
      })
        .setRequired(false)
        .addChoices(...STYLE_CHOICES)
    ),

  async execute(interaction) {
    const lunnar_coins = await LunarModel.findOne({ user_id: interaction.user.id });
    const userLanguage = lunnar_coins.language || 'pt';

    return interaction.reply({ content: i18next.t(`imagine.error`, { 
      lng: userLanguage 
  }), flags: MessageFlags.Ephemeral})
    try {
      // Verificação inicial do canal
      if (!interaction.channel.nsfw) {
        return interaction.reply({ 
          content: `<:naoJEFF:1109179756831854592> | Esse canal não é nsfw!`,
          ephemeral: true 
        });
      }

      // Mensagem de carregamento
      const loadingMessage = await interaction.reply({ 
        content: `<a:azu_carregando:1122709454291488850> | Estou pensando...`,
        fetchReply: true
      });

      // Inicialização/verificação do usuário no banco de dados
      const [user, banStatus] = await Promise.all([
        initializeUser(interaction.user.id),
        initializeBanStatus(interaction.user.id)
      ]);

      // Verificação de ban
      if (banStatus.isBanned) {
        return interaction.editReply({
          content: `<:moderator:1238705467883126865> | Você está banido! Para contestar o banimento entre em [meu servidor](https://discord.gg/23AhePRDAf)`
        });
      }

      // Verificação de limites
      const limit = user.isVip ? LIMITS.VIP : LIMITS.FREE;
      if (user.image_prompts_used >= limit) {
        return interaction.editReply({
          content: `<:naoJEFF:1109179756831854592> | Você atingiu o limite de prompts ${user.isVip ? 'vip' : 'gratis'} diário`
        });
      }

      // Geração da imagem
      const prompt = interaction.options.getString('prompt');
      const style = interaction.options.getString('style') || 'photographic';
      
      const translatedPrompt = await translate(prompt, { to: 'en' });
      const imageGeneration = await prodia.generate({
        prompt: translatedPrompt,
        style_preset: style,
        model: 'v1-5-pruned-emaonly.safetensors [d7049739]'
      });
      
      const result = await prodia.wait(imageGeneration);

      // Atualização do contador de prompts
      await LunarModel.updateOne(
        { user_id: interaction.user.id },
        { $inc: { image_prompts_used: 1 } }
      );

      // Envio da resposta final
      await loadingMessage.delete();
      return loadingMessage.editReply({ 
        files: [result.imageUrl], 
        content: `${interaction.user} Sua imagem ficou pronta!\n<:file:1052384025089687614> Prompt: ${prompt}\n<:config:1052355072782254152> Preset: ${style}`
      });

    } catch (error) {
      console.error('Erro no comando imagine:', error);
      return interaction.editReply({
        content: '❌ Ocorreu um erro ao gerar a imagem. Tente novamente mais tarde.',
        ephemeral: true
      });
    }
  }
};

// Funções auxiliares
async function initializeUser(userId) {
  let user = await LunarModel.findOne({ user_id: userId });
  if (!user) {
    user = await LunarModel.create({ 
      user_id: userId, 
      coins: 0, 
      isVip: false, 
      prompts_used: 0 
    });
  }
  return user;
}

async function initializeBanStatus(userId) {
  let banStatus = await BanModel.findOne({ user_id: userId });
  if (!banStatus) {
    banStatus = await BanModel.create({ 
      user_id: userId, 
      isBanned: false, 
      prompts_sexuais: 0 
    });
  }
  return banStatus;
}