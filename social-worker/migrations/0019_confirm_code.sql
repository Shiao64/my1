-- 6-digit code in the confirmation letter, entered in the page the person started from
-- (POST /social/going/code), so nobody has to switch browsers. Additive only.
ALTER TABLE profile_verify ADD COLUMN code_hash TEXT;
ALTER TABLE profile_verify ADD COLUMN code_tries INTEGER DEFAULT 0;
