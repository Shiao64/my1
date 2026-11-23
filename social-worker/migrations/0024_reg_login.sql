-- 2026-11-23 TP step 2 (docs/tangopass.md): sign in with a personal link + a six-digit password; one row per signed-in device.
-- Adds only. The old 40-character passwords and the one-time front-desk links stop here and are not kept,
-- so going back to the step-1 worker does not bring them back; people get new ones through 「重设」.
ALTER TABLE reg_admin ADD COLUMN link_hash TEXT;        -- sha256 of the key in the personal link (the QR is that link; it holds no password)
ALTER TABLE reg_admin ADD COLUMN pin_hash TEXT;         -- HMAC(REG_PIN_PEPPER, salt:pin); the six digits themselves are never stored
ALTER TABLE reg_admin ADD COLUMN pin_salt TEXT;
ALTER TABLE reg_admin ADD COLUMN pin_temp INTEGER NOT NULL DEFAULT 0;   -- 1 = the temporary one, must be changed at the first sign-in
ALTER TABLE reg_admin ADD COLUMN fails INTEGER NOT NULL DEFAULT 0;      -- wrong in a row, counted per person (not per phone)
ALTER TABLE reg_admin ADD COLUMN locked_until TEXT;     -- 5 wrong: 15 minutes
ALTER TABLE reg_admin ADD COLUMN stopped_at TEXT;       -- 10 wrong: stopped until someone above resets
ALTER TABLE reg_staff ADD COLUMN link_hash TEXT;
ALTER TABLE reg_staff ADD COLUMN pin_hash TEXT;
ALTER TABLE reg_staff ADD COLUMN pin_salt TEXT;
ALTER TABLE reg_staff ADD COLUMN pin_temp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reg_staff ADD COLUMN fails INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reg_staff ADD COLUMN locked_until TEXT;
ALTER TABLE reg_staff ADD COLUMN stopped_at TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS reg_admin_link ON reg_admin(link_hash);
CREATE UNIQUE INDEX IF NOT EXISTS reg_staff_link ON reg_staff(link_hash);
CREATE TABLE IF NOT EXISTS reg_device (
  id INTEGER PRIMARY KEY AUTOINCREMENT,   -- order of sign-in: over the limit, the lowest id goes first
  kind TEXT NOT NULL,                     -- admin = reg_admin, staff = reg_staff (前台)
  person INTEGER NOT NULL,
  event TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,        -- sha256 of the key kept on that phone
  created_at TEXT NOT NULL,
  auth_at TEXT NOT NULL,                  -- when the password was last typed on this phone
  ended_at TEXT,                          -- signed out; the row stays so the phone can be told why
  why TEXT                                -- replaced | reset | deleted | role | logout
);
CREATE INDEX IF NOT EXISTS reg_device_person ON reg_device(kind, person);
UPDATE reg_admin SET pass_hash = '-';
UPDATE reg_staff SET act_hash = NULL, device_hash = NULL;
