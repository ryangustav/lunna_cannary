const i18next = require('i18next');
const fs = require('fs');
const path = require('path');

// Carrega as traduções dinamicamente
function loadTranslations() {
    const translations = {};
    const languagesPath = path.join(__dirname, '../languages');
    
    fs.readdirSync(languagesPath).forEach(lang => {
        translations[lang] = {
            translation: {}
        };
        
        const langPath = path.join(languagesPath, lang);
        fs.readdirSync(langPath).forEach(file => {
            if (file.endsWith('.json')) {
                const content = require(path.join(langPath, file));
                const namespace = file.replace('.json', '');
                translations[lang].translation[namespace] = content;
            }
        });
    });
    
    return translations;
}

// Inicializa o i18next
async function setupI18n() {
    await i18next.init({
        lng: 'pt',
        fallbackLng: 'en',
        resources: loadTranslations(),
        interpolation: {
            escapeValue: false
        }
    });
    
    return i18next;
}

module.exports = { setupI18n };