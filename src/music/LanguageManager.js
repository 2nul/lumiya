const fs = require('fs');
const path = require('path');
const db = require('../database');

/**
 * Language utility functions for the music engine.
 *
 * Adapter layer: reads JSON locale packs from src/music/locales and resolves
 * the per-guild language through Lumiya's own settings store (db.getSetting).
 */
class LanguageManager {
    constructor() {
        this.languagesPath = path.join(__dirname, 'locales');
        this.defaultLanguage = 'vi';
        this.fallbackLanguage = 'en';
        this.loadedLanguages = new Map();

        this.loadLanguages();
    }

    loadLanguages() {
        try {
            const languageFiles = fs.readdirSync(this.languagesPath).filter(file => file.endsWith('.json'));

            for (const file of languageFiles) {
                const langCode = file.replace('.json', '');
                const langData = JSON.parse(fs.readFileSync(path.join(this.languagesPath, file), 'utf8'));
                this.loadedLanguages.set(langCode, langData);
            }

            console.log(`$LumiyaBot: Loaded ${this.loadedLanguages.size} music locale(s)`);
        } catch (error) {
            console.error('$LumiyaBot: Error loading music language files:', error);
        }
    }

    getServerLanguage(guildId) {
        const lang = db.getSetting(guildId, 'language');
        if (lang && this.loadedLanguages.has(lang)) return lang;
        return this.defaultLanguage;
    }

    getServerLanguageSync(guildId) {
        return this.getServerLanguage(guildId);
    }

    async setServerLanguage(guildId, langCode) {
        if (!this.isLanguageSupported(langCode)) return false;
        db.setSetting(guildId, 'language', langCode);
        return true;
    }

    async getTranslation(guildId, key, variables = {}) {
        const langCode = this.getServerLanguage(guildId);
        return this.getTranslationSync(langCode, key, variables);
    }

    getTranslationSync(langCode, key, variables = {}) {
        try {
            const langData = this.loadedLanguages.get(langCode) || this.loadedLanguages.get(this.defaultLanguage) || this.loadedLanguages.get(this.fallbackLanguage);

            if (!langData) {
                return key;
            }

            const keys = key.split('.');
            let translation = langData;

            for (const k of keys) {
                if (translation[k] === undefined) {
                    const fallbackData = this.loadedLanguages.get(this.fallbackLanguage);
                    if (fallbackData) {
                        translation = fallbackData;
                        for (const fallbackKey of keys) {
                            if (translation[fallbackKey] === undefined) {
                                return key;
                            }
                            translation = translation[fallbackKey];
                        }
                        break;
                    }
                    return key;
                }
                translation = translation[k];
            }

            if (typeof translation === 'string' && Object.keys(variables).length > 0) {
                for (const [variable, value] of Object.entries(variables)) {
                    translation = translation.replace(new RegExp(`\\{${variable}\\}`, 'g'), value);
                }
            }

            return translation || key;
        } catch (error) {
            return key;
        }
    }

    getAvailableLanguages() {
        const languages = [];
        for (const [code, data] of this.loadedLanguages) {
            languages.push({
                code: data.language?.code || code,
                name: data.language?.name || code,
                flag: data.language?.flag || ''
            });
        }
        return languages;
    }

    isLanguageSupported(langCode) {
        return this.loadedLanguages.has(langCode);
    }

    getLanguageData(langCode) {
        return this.loadedLanguages.get(langCode) || null;
    }

    clearServerLanguageCache(guildId) {}

    clearAllLanguageCache() {}

    async refreshServerLanguage(guildId) {
        return this.getServerLanguage(guildId);
    }

    reloadLanguages() {
        this.loadedLanguages.clear();
        this.loadLanguages();
    }
}

const languageManager = new LanguageManager();

module.exports = languageManager;