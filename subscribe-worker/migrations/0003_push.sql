-- Web push subscriptions (VAPID). One row per browser/device.
CREATE TABLE IF NOT EXISTS push_subs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en',
  created_at TEXT NOT NULL,
  last_ok_at TEXT,
  fails INTEGER NOT NULL DEFAULT 0
);
-- Every /push/send call (event diff, 临时通知 notice, 不定期广告 ad); used for rate limits.
CREATE TABLE IF NOT EXISTS push_log(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sent_at TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT,
  n_subs INTEGER, sent INTEGER, failed INTEGER, gone INTEGER,
  is_test INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS push_log_time ON push_log(sent_at, kind);
