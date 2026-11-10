-- Per-show intent anchor, series favorites, and confirmation-mail limits.
-- Not applied to production by this PR. Do not run it against the live D1 from here.
CREATE TABLE IF NOT EXISTS going_intents_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  card_id TEXT NOT NULL,
  anchor TEXT NOT NULL DEFAULT '',
  intent TEXT NOT NULL,
  occurrence_date TEXT,
  attend_date TEXT,
  transport INTEGER NOT NULL DEFAULT 0,
  notify INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  mail_status TEXT NOT NULL DEFAULT 'none',
  mail_fp TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(email, card_id, anchor)
);
INSERT INTO going_intents_v2(email,card_id,anchor,intent,occurrence_date,attend_date,transport,notify,status,mail_status,mail_fp,sent_at,created_at,updated_at)
SELECT email, card_id,
  CASE WHEN occurrence_date IS NOT NULL AND occurrence_date != '' THEN occurrence_date ELSE '' END,
  intent, occurrence_date,
  CASE WHEN intent = 'going' THEN occurrence_date ELSE NULL END,
  transport, notify, status, mail_status, mail_fp, sent_at, created_at, updated_at
FROM going_intents;
DROP TABLE going_intents;
ALTER TABLE going_intents_v2 RENAME TO going_intents;
CREATE INDEX IF NOT EXISTS going_active_card ON going_intents(card_id, status);

CREATE TABLE IF NOT EXISTS going_pending_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  card_id TEXT NOT NULL,
  anchor TEXT NOT NULL DEFAULT '',
  intent TEXT NOT NULL,
  occurrence_date TEXT,
  attend_date TEXT,
  transport INTEGER NOT NULL DEFAULT 0,
  notify INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  consumed_at TEXT,
  UNIQUE(email, card_id, anchor)
);
INSERT INTO going_pending_v2(email,card_id,anchor,intent,occurrence_date,attend_date,transport,notify,name,created_at,consumed_at)
SELECT email, card_id,
  CASE WHEN occurrence_date IS NOT NULL AND occurrence_date != '' THEN occurrence_date ELSE '' END,
  intent, occurrence_date,
  CASE WHEN intent = 'going' THEN occurrence_date ELSE NULL END,
  transport, notify, name, created_at, consumed_at
FROM going_pending;
DROP TABLE going_pending;
ALTER TABLE going_pending_v2 RENAME TO going_pending;

CREATE TABLE IF NOT EXISTS going_favs (
  email TEXT NOT NULL,
  card_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (email, card_id)
);
CREATE TABLE IF NOT EXISTS going_confirm_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  dev TEXT NOT NULL DEFAULT '',
  ip_hash TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS going_confirm_email ON going_confirm_log(email, created_at);
CREATE INDEX IF NOT EXISTS going_confirm_ip ON going_confirm_log(ip_hash, created_at);
CREATE INDEX IF NOT EXISTS going_confirm_dev ON going_confirm_log(dev, created_at);
