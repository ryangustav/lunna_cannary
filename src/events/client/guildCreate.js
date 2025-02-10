const Discord = require('discord.js');

module.exports = {
  name: 'guildCreate',
  async execute(guild, client) {
    const firstChannel = guild.channels.cache.find(ch => ch.type === 0);
    const owner = client.users.cache.get(guild.ownerId)
    if (!firstChannel) {
      console.error('Não encontrei o canal do servidor');
      return; 
    }

    try {
      const invite = await firstChannel.createInvite({ maxAge: 0, temporary: false})
      const embed = new Discord.EmbedBuilder()
        .setTitle(`${client.user.username} | New guild`)
        .setColor('#be00e8')
        .setDescription(`
          <a:staff:1238703736524771491> | Guild: [${guild.name}](${invite.url})
          <:IDD:1052973779153846372> | Dono: ${owner.username}
          <:users:1055062836704976997> | Membros: ${guild.members.cache.size} membros
          <:file:1052384025089687614> | Canais: ${guild.channels.cache.size} canais
        `);
      client.channels.cache.get('1241927421054423050').send({ embeds: [embed] });
    } catch (error) {
      console.error('Error creating invite:', error);
    }
  },
};
