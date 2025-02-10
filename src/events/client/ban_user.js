const bania = require("../../database/schema/banned_user.js");
const discord = require('discord.js')

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
if (!interaction.isButton()) return;
const verify = interaction.customId.split('-')
if (verify[0] !== 'bania') return;
if (interaction.user.id !== '852880352313868298') return interaction.reply({ content: `<:naoJEFF:1109179756831854592> | Você não tem permissão para isso!`})
const user = client.users.cache.get(verify[1]);
const verifydb = await bania.findOne({ user_id: user.id })
if (!verifydb) await bania.create({ user_id: user.id, isBanned: false, prompts_sexuais: 0 })
const ban = await bania.findOne({ user_id: user.id })
if (ban.isBanned === true) return interaction.reply({ content: `<:bl_info:1053256877896634439> | O usuario ja esta banido!`,  flags: discord.MessageFlags.Ephemeral })
ban.isBanned = true;
ban.save()

interaction.reply({ content: `<:simJEFF:1109206099346862140> | Pronto! o usuario foi banido`,  flags: discord.MessageFlags.Ephemeral})
user.send({ content: `<:moderator:1238705467883126865> | ${user} você foi banido da Lunna!\n<:file:1052384025089687614> | Motivo: Excesso de prompts proibidos/sexuais/gore!`})
    },
};