const fs = require('fs');
const path = require('path');
const config = require('./config');

const MAX_LEVEL = config.maxLevel || 500;
const MAX_XP = config.maxXPPerLevel || 50000;

function getXPNeeded(level) {
  return Math.min(level * 100 + 50, MAX_XP);
}

function clampInt(val, min, max) {
  const n = parseInt(val);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let data = { cases: [], warns: [], xp: [], settings: {}, appeals: [], tempActions: [] };

if (fs.existsSync(DB_PATH)) {
  try { data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { data = {}; }
}

data.cases = Array.isArray(data.cases) ? data.cases : [];
data.warns = Array.isArray(data.warns) ? data.warns : [];
data.xp = Array.isArray(data.xp) ? data.xp : [];
data.appeals = Array.isArray(data.appeals) ? data.appeals : [];
data.tempActions = Array.isArray(data.tempActions) ? data.tempActions : [];
if (!data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) data.settings = {};

for (const entry of data.xp || []) {
  entry.level = clampInt(entry.level, 0, MAX_LEVEL);
  entry.xp = clampInt(entry.xp, 0, MAX_XP);
  entry.messages = clampInt(entry.messages, 0, 1000000000);
  entry.streak = clampInt(entry.streak, 0, 1000000);
}

let saveTimeout = null;
function scheduleSave() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    saveTimeout = null;
  }, 5000);
}

function forceSave() {
  if (saveTimeout) { clearTimeout(saveTimeout); saveTimeout = null; }
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

process.on('exit', forceSave);
process.on('SIGINT', () => { forceSave(); process.exit(); });
process.on('SIGTERM', () => { forceSave(); process.exit(); });

module.exports = {
  forceSave,
  getXPNeeded,
  clampInt,
  MAX_LEVEL,
  MAX_XP,

  getSetting(guildId, key) {
    return data.settings[`${guildId}:${key}`] || null;
  },

  setSetting(guildId, key, value) {
    data.settings[`${guildId}:${key}`] = value;
    scheduleSave();
  },

  deleteSetting(guildId, key) {
    delete data.settings[`${guildId}:${key}`];
    scheduleSave();
  },

  getAllSettings(guildId) {
    const result = {};
    for (const [k, v] of Object.entries(data.settings)) {
      if (k.startsWith(`${guildId}:`)) {
        result[k.split(':')[1]] = v;
      }
    }
    return result;
  },

  createCase(guildId, userId, moderatorId, type, reason, duration) {
    const id = (data.cases.filter(c => c.guildId === guildId).length || 0) + 1;
    const expTime = duration ? Date.now() + duration : null;
    const caseEntry = { id, guildId, userId, moderatorId, type, reason, duration, createdAt: Date.now(), expiresAt: expTime };
    data.cases.push(caseEntry);
    scheduleSave();
    return caseEntry;
  },

  getCase(guildId, caseId) {
    return data.cases.find(c => c.guildId === guildId && c.id === caseId) || null;
  },

  getUserCases(guildId, userId) {
    return data.cases.filter(c => c.guildId === guildId && c.userId === userId).sort((a, b) => b.id - a.id);
  },

  getLatestCase(guildId, userId) {
    const cases = this.getUserCases(guildId, userId);
    return cases.length > 0 ? cases[0] : null;
  },

  getActiveWarns(guildId, userId) {
    return data.warns.filter(w => w.guildId === guildId && w.userId === userId);
  },

  getWarn(guildId, warnId) {
    return data.warns.find(w => w.guildId === guildId && w.id === warnId) || null;
  },

  addWarn(guildId, userId, caseId) {
    data.warns.push({ id: Date.now(), guildId, userId, caseId, createdAt: Date.now() });
    scheduleSave();
  },

  removeWarn(guildId, warnId) {
    data.warns = data.warns.filter(w => !(w.guildId === guildId && w.id === warnId));
    scheduleSave();
  },

  removeWarnsByCase(guildId, caseId) {
    data.warns = data.warns.filter(w => !(w.guildId === guildId && w.caseId === caseId));
    scheduleSave();
  },

  getXP(guildId, userId) {
    return data.xp.find(x => x.guildId === guildId && x.userId === userId) || null;
  },

  setXP(guildId, userId, fields) {
    const entry = this.getOrCreateXP(guildId, userId);
    if (fields.level !== undefined) entry.level = clampInt(fields.level, 0, MAX_LEVEL);
    if (fields.xp !== undefined) entry.xp = clampInt(fields.xp, 0, MAX_XP);
    if (fields.messages !== undefined) entry.messages = clampInt(fields.messages, 0, 1000000000);
    if (fields.streak !== undefined) entry.streak = clampInt(fields.streak, 0, 1000000);
    if (fields.lastActive !== undefined) entry.lastActive = fields.lastActive;
    scheduleSave();
    return entry;
  },

  getOrCreateXP(guildId, userId) {
    let entry = data.xp.find(x => x.guildId === guildId && x.userId === userId);
    if (!entry) {
      entry = { guildId, userId, xp: 0, level: 0, messages: 0, streak: 0, lastActive: null };
      data.xp.push(entry);
    } else {
      entry.level = clampInt(entry.level, 0, MAX_LEVEL);
      entry.xp = clampInt(entry.xp, 0, MAX_XP);
      entry.messages = clampInt(entry.messages, 0, 1000000000);
      entry.streak = clampInt(entry.streak, 0, 1000000);
      if (!Number.isInteger(entry.lastActive)) entry.lastActive = entry.lastActive || null;
    }
    return entry;
  },

  addXP(guildId, userId, amount) {
    if (!Number.isFinite(amount) || amount <= 0) return { entry: this.getOrCreateXP(guildId, userId), leveledUp: false };
    const entry = this.getOrCreateXP(guildId, userId);
    if (entry.level >= MAX_LEVEL) {
      entry.xp = 0;
      entry.messages += 1;
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (entry.lastActive === yesterday) { entry.streak += 1; } else if (entry.lastActive !== today) { entry.streak = 1; }
      entry.lastActive = today;
      scheduleSave();
      return { entry, leveledUp: false };
    }
    entry.xp += Math.min(amount, MAX_XP);
    entry.messages += 1;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (entry.lastActive === yesterday) { entry.streak += 1; } else if (entry.lastActive !== today) { entry.streak = 1; }
    entry.lastActive = today;
    let leveledUp = false;
    while (entry.xp >= getXPNeeded(entry.level) && entry.level < MAX_LEVEL) {
      entry.xp -= getXPNeeded(entry.level);
      entry.level += 1;
      leveledUp = true;
    }
    if (entry.level >= MAX_LEVEL) entry.xp = 0;
    scheduleSave();
    return { entry, leveledUp };
  },

  getLeaderboard(guildId, limit = 10) {
    return data.xp.filter(x => x.guildId === guildId).sort((a, b) => b.xp + b.level * 1000 - (a.xp + a.level * 1000)).slice(0, limit);
  },

  getRank(guildId, userId) {
    const lb = data.xp.filter(x => x.guildId === guildId).sort((a, b) => b.xp + b.level * 1000 - (a.xp + a.level * 1000));
    return lb.findIndex(x => x.userId === userId) + 1;
  },

  createAppeal(guildId, userId, caseId, reason) {
    const id = (data.appeals.filter(a => a.guildId === guildId).length || 0) + 1;
    const appeal = { id, guildId, userId, caseId, reason, status: 'pending', adminNote: null, createdAt: Date.now() };
    data.appeals.push(appeal);
    scheduleSave();
    return appeal;
  },

  getAppeals(guildId, status) {
    return data.appeals.filter(a => a.guildId === guildId && (!status || a.status === status)).sort((a, b) => b.createdAt - a.createdAt);
  },

  getAppeal(guildId, appealId) {
    return data.appeals.find(a => a.guildId === guildId && a.id === appealId) || null;
  },

  updateAppeal(guildId, appealId, updates) {
    const appeal = this.getAppeal(guildId, appealId);
    if (appeal) Object.assign(appeal, updates);
    scheduleSave();
    return appeal;
  },

  addTempAction(guildId, userId, type, expiresAt, extra) {
    const action = { id: Date.now(), guildId, userId, type, expiresAt, ...extra, createdAt: Date.now() };
    data.tempActions.push(action);
    scheduleSave();
    return action;
  },

  getExpiredTempActions() {
    const now = Date.now();
    return data.tempActions.filter(a => a.expiresAt && a.expiresAt <= now);
  },

  removeTempAction(id) {
    data.tempActions = data.tempActions.filter(a => a.id !== id);
    scheduleSave();
  },

  getUserWarnings(guildId, userId) {
    return data.warns.filter(w => w.guildId === guildId && w.userId === userId);
  },
};
