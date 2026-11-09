-- Star intent (Going / Interested). Private rows only. Not a public roster.
-- Apply on the social D1 (binding SDB) when this worker is deployed. Not applied by this PR.
CREATE TABLE IF NOT EXISTS profile_verify (
  email TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  tries INTEGER NOT NULL DEFAULT 0,
  lang TEXT NOT NULL DEFAULT 'en',
  name TEXT,
  city TEXT,
  role TEXT,
  alert_opt_in INTEGER NOT NULL DEFAULT 0,
  ret TEXT
);
CREATE TABLE IF NOT EXISTS going_pending (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  card_id TEXT NOT NULL,
  intent TEXT NOT NULL,
  occurrence_date TEXT,
  transport INTEGER NOT NULL DEFAULT 0,
  notify INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  consumed_at TEXT,
  UNIQUE(email, card_id)
);
CREATE TABLE IF NOT EXISTS going_intents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  card_id TEXT NOT NULL,
  intent TEXT NOT NULL,
  occurrence_date TEXT,
  transport INTEGER NOT NULL DEFAULT 0,
  notify INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  mail_status TEXT NOT NULL DEFAULT 'none',
  mail_fp TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(email, card_id)
);
CREATE INDEX IF NOT EXISTS going_active_card ON going_intents(card_id, status);
CREATE TABLE IF NOT EXISTS going_sends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  card_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS going_sends_email ON going_sends(email, card_id, created_at);
CREATE INDEX IF NOT EXISTS going_sends_ip ON going_sends(ip_hash, created_at);
CREATE TABLE IF NOT EXISTS going_reports (
  report_key TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'review',
  tz TEXT NOT NULL,
  range_start TEXT NOT NULL,
  range_end TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  body TEXT NOT NULL
);
