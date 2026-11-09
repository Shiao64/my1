-- Per-event update queue. Rows are facts already confirmed on the card or posted by an admin review.
-- Sending stays off until GOING_NOTICE_SEND=on. This file is not applied to production by the PR.
CREATE TABLE IF NOT EXISTS going_notice_queue (
  notice_key TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  event_date TEXT,
  title_zh TEXT NOT NULL,
  title_en TEXT NOT NULL,
  body_zh TEXT NOT NULL,
  body_en TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TEXT NOT NULL,
  sent_at TEXT,
  error TEXT
);
CREATE TABLE IF NOT EXISTS going_notice_sends (
  notice_key TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  at TEXT NOT NULL,
  PRIMARY KEY(notice_key, email)
);
