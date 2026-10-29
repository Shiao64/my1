-- Double opt-in list. Leaves the existing `subs` table (collect-only rows since 2026-10-27) untouched.
CREATE TABLE IF NOT EXISTS email_subs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  wechat TEXT,
  types TEXT NOT NULL DEFAULT 'featured,regular',
  cities TEXT NOT NULL DEFAULT 'all',
  lang TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL CHECK(status IN ('pending','active','unsubscribed')),
  confirm_hash TEXT,            -- SHA-256 of the confirm token (token itself only lives in the email)
  pending_since TEXT,           -- ISO time; pending rows older than 7 days are deleted by the cron
  unsub_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  confirmed_at TEXT,
  unsubscribed_at TEXT,
  ip_hash TEXT,
  confirm_mail_status TEXT,
  welcome_mail_status TEXT,
  is_test INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS email_subs_pending ON email_subs(status, pending_since);
CREATE UNIQUE INDEX IF NOT EXISTS email_subs_confirm ON email_subs(confirm_hash);
CREATE UNIQUE INDEX IF NOT EXISTS email_subs_unsub ON email_subs(unsub_token);
