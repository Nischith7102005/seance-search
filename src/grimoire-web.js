const Database = require('better-sqlite3');
const path = require('path');

let db;

function getDbPath() {
  return path.join(__dirname, '..', 'grimoire.db');
}

function initGrimoire() {
  db = new Database(getDbPath());

  db.exec(`
    CREATE TABLE IF NOT EXISTS ghosts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE NOT NULL,
      domain TEXT NOT NULL,
      era TEXT,
      first_summoned INTEGER NOT NULL,
      last_summoned INTEGER NOT NULL,
      last_query TEXT,
      visit_count INTEGER DEFAULT 1,
      channeling TEXT,
      personality TEXT,
      ectoplasm INTEGER DEFAULT 50
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

function saveGhost(data) {
  const existing = db.prepare('SELECT id, visit_count FROM ghosts WHERE url = ?').get(data.url);

  if (existing) {
    db.prepare(`
      UPDATE ghosts SET
        last_summoned = ?,
        last_query = ?,
        visit_count = ?,
        channeling = ?,
        personality = ?,
        ectoplasm = ?
      WHERE url = ?
    `).run(
      data.lastSummoned,
      data.lastQuery,
      existing.visit_count + 1,
      data.channeling,
      data.personality,
      data.ectoplasm,
      data.url
    );
  } else {
    db.prepare(`
      INSERT INTO ghosts (url, domain, era, first_summoned, last_summoned, last_query, channeling, personality, ectoplasm)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.url,
      data.domain,
      typeof data.era === 'object' ? data.era.label : data.era,
      data.lastSummoned,
      data.lastSummoned,
      data.lastQuery,
      data.channeling,
      data.personality,
      data.ectoplasm
    );
  }
}

function getGhost(url) {
  return db.prepare('SELECT * FROM ghosts WHERE url = ?').get(url) || null;
}

function getAllGhosts() {
  return db.prepare('SELECT * FROM ghosts ORDER BY last_summoned DESC').all();
}

function saveSettings(settings) {
  const insert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const saveAll = db.transaction((s) => {
    for (const [key, value] of Object.entries(s)) {
      insert.run(key, String(value));
    }
  });
  saveAll(settings);
}

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

module.exports = { initGrimoire, saveGhost, getGhost, getAllGhosts, saveSettings, getSettings };
