const fs = require('fs');
const path = require('path');


module.exports = (client) => {
    // função para carregar eventos de forma recursiva
    const loadEvents = (dir) => {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {

                // se for um diretório, chame a função recursivamente
                loadEvents(filePath);

            } else if (file.endsWith('.js')) {

                // se for um arquivo .js, carregue o evento
                const event = require(filePath);
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                };

            };
        };
    };

    // pasta raiz para carregar eventos
    const eventsPath = path.join(__dirname, "../events");
    loadEvents(eventsPath);
};