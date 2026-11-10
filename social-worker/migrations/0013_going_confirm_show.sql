-- Which show a confirmation mail was for. Older rows stay card_id ''.
-- Not applied to production by this PR.
ALTER TABLE going_confirm_log ADD COLUMN card_id TEXT NOT NULL DEFAULT '';
ALTER TABLE going_confirm_log ADD COLUMN anchor TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS going_confirm_show ON going_confirm_log(email, card_id, anchor, created_at);
