CREATE TABLE IF NOT EXISTS email_subs(
  email TEXT PRIMARY KEY, lang TEXT, status TEXT NOT NULL DEFAULT 'pending', -- pending|active|unsubscribed
  verify_token TEXT, verify_expires INTEGER, unsub_token TEXT NOT NULL,
  created_at TEXT NOT NULL, verified_at TEXT, unsubscribed_at TEXT);
CREATE TABLE IF NOT EXISTS wechat_ids(
  id INTEGER PRIMARY KEY AUTOINCREMENT, wechat TEXT NOT NULL, lang TEXT,
  created_at TEXT NOT NULL, reviewed INTEGER NOT NULL DEFAULT 0);
