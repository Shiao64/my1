-- Organizer welcome record. This is 0017 because production already applied
-- 0015_going_pass.sql and 0016_phone_bind.sql. Do not apply this file until a
-- separate go-live approval. GOING_WELCOME_SEND stays unset. Review does not
-- write this table and does not send mail.
CREATE TABLE IF NOT EXISTS org_notice (
  org_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  welcome_sent_at TEXT,
  opted_out_at TEXT
);
