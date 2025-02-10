module.exports = {
    name: "interactionCreate",
    async execute(interaction, client) {

        // isAutocomplete
        if (interaction.isAutocomplete()) {

            // comando utilizado
            const command = interaction.client.commands.get(interaction.commandName);

            // comando inexistente
            if (!command) {
                console.error(`[AutoComplete] Nenhum comando correspondente a **${interaction.commandName}** foi encontrado.`);
                return;
            };

            // solução de erros - try catch
            try {
                await command.autocomplete(interaction);
            } catch (err) {
                console.error(`[AutoComplete] ${err}`);
                return;
            };

        };

    },
};