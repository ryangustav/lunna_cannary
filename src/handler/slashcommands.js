// discord - api
const { REST } = require("@discordjs/rest");
const { Routes } = require('discord-api-types/v9');
const colors = require("colors")
// acesso - arquivos
const fs = require("fs");
const path = require('path')
// discord.js
const { EmbedBuilder, WebhookClient } = require("discord.js");

// config.json
require("dotenv").config();

module.exports = (client) => {

    // importa os comandos
    client.handleCommands = async (dir) => {
        
        client.commandArray = [];
        const commandFiles = fs.readdirSync(`${dir}`);
        for (const file of commandFiles) {
            const filePath = path.resolve(__dirname, '../..', dir, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {

                // se for um diretório, chame a função recursivamente
                client.handleCommands(filePath);
 
            } else if (file.endsWith('.js')) {
            const command = await require(filePath);
            client.commands.set(command.data.name, command);
            client.commandArray.push(command.data.toJSON());
            }
        };
    };

    // faz a requisição dos comandos
    client.on("ready", async (r) => {
        try {
            const rest = new REST({
                version: `9`
            }).setToken(process.env.token);
            await rest.put(
                Routes.applicationCommands(client.user.id), {
                body: client.commandArray
            });
        console.log(`[LOG]`.yellow + ` ${client.commandArray.length} `.white + `Comando(s) Slash carregado(s)`.green);
        } catch (error) {
            console.log(error);
        };
    });
};