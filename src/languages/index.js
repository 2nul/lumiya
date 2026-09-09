const db = require('../database');
const vi = require('./vi');
const en = require('./en');

const translations = { vi, en };

function t(guildId, key, replacements) {
  const lang = db.getSetting(guildId, 'language') || 'vi';
  let text = getKey(translations[lang], key) || getKey(translations.vi, key) || key;
  if (replacements) {
    for (const [k, v] of Object.entries(replacements)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }
  return text;
}

function getKey(obj, key) {
  return key.split('.').reduce((o, k) => (o && o[k]) || undefined, obj);
}

function getLang(guildId) {
  return db.getSetting(guildId, 'language') || 'vi';
}

module.exports = { t, getLang, translations };
