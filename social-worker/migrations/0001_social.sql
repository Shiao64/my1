-- Asia Tango Map likes + comments (2026-11-04).
CREATE TABLE IF NOT EXISTS likes(card_id TEXT NOT NULL, device TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(card_id, device));
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'en',
  verified_at TEXT, code_hash TEXT, code_sent_at TEXT, code_tries INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, ip_hash TEXT);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS comments(id INTEGER PRIMARY KEY AUTOINCREMENT, card_id TEXT NOT NULL, user_id INTEGER NOT NULL, body TEXT NOT NULL,
  created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'visible', ip_hash TEXT);
CREATE INDEX IF NOT EXISTS comments_card ON comments(card_id, status, created_at);
