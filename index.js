// discors.js
const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
require('dotenv').config();
const db_connect = require("./src/database/connect.js")
const dailyRestart = require("./src/util/daily_reset.js")
const { setupI18n } = require("./src/util/language_util.js")
const RifaDrawSystem = require('./src/util/rifa.js');

// client

async function init() {
const client = new Client({
    intents: [Object.keys(GatewayIntentBits)],
    partials: [Object.keys(Partials)]
});
const rifaSystem = new RifaDrawSystem(client);

// permite importar o client externamente
module.exports = client;

// acesso - arquivos
const fs = require("fs");

// collections
client.commands = new Collection();

// handlers
const handlers = fs.readdirSync("./src/handler").filter((file) => file.endsWith('.js'));
for (const file of handlers) {
    require(`./src/handler/${file}`)(client);
};
client.handleCommands("./src/Commands");
// apagando o console
console.clear();

//Functions/Classes
db_connect();
dailyRestart();
await setupI18n();
rifaSystem.start();

//Logando no bot
client.login(process.env.token);

// unhandledRejection

process.on('unhandledRejection', (reason, promise) => {
  console.log(`🚫 Erro Detectado:\n\n${reason.stack}`);
});

process.on('uncaughtException', (error, origin) => {
  console.log(`🚫 Erro Detectado:]\n\n${error.stack}`);
});

process.on('uncaughtExceptionMonitor', (error, origin) => {
  console.log(`🚫 Erro Detectado:\n\n${error.stack}`);
});

}

init();