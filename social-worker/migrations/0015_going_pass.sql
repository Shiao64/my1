-- Long-lived personal subscription link. One active link per person.
-- The raw token is never stored. token_hash is SHA-256 of "atm-pass:" plus the token.
-- Apply on the social D1 (binding SDB, same database as DB) at go-live, before the worker that reads this table.
-- Not applied to production by this pull request.
CREATE TABLE IF NOT EXISTS going_pass (
  user_id INTEGER PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
