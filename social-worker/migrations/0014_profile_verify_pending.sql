-- One-time confirm row keeps the star choice: pending intent, card, and site-wide opt-in.
-- Return URL stays in the existing ret column.
-- Not applied to production by this PR. Do not run it against the live D1 from here.
ALTER TABLE profile_verify ADD COLUMN pending_intent TEXT;
ALTER TABLE profile_verify ADD COLUMN card_id TEXT;
ALTER TABLE profile_verify ADD COLUMN wants_sitewide INTEGER NOT NULL DEFAULT 0;
