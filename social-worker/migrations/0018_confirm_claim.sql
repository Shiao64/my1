-- Nonce so the browser that asked for the confirmation email can pick up a session
-- after a different browser opens the link. Additive only.
ALTER TABLE profile_verify ADD COLUMN claim_hash TEXT;
ALTER TABLE profile_verify ADD COLUMN confirmed_at TEXT;
ALTER TABLE profile_verify ADD COLUMN claim_session TEXT;
CREATE INDEX IF NOT EXISTS profile_verify_claim ON profile_verify(claim_hash);
