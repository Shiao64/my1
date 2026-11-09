-- Organizer intent digests. One row per featured week or regular occurrence.
-- Not applied to production by this PR. GOING_DIGEST_SEND stays unset, and no live cron reads this table.
CREATE TABLE IF NOT EXISTS going_digests (
  digest_key TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  period TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  snapshot TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS going_digests_card ON going_digests(card_id, status);
