-- Phone bound to a verified email, for signing in on another browser.
-- The full number is stored. Login compares only its last 4 digits, together with the email.
-- A number entered at subscribe time stays in profile_phone until the email confirm, then moves to user_phone.
-- Failed email + last-4 tries are counted in phone_login_lock and pause further tries for a while.
-- Apply on the social D1 (binding SDB, same database as DB) at go-live, before the worker that reads these tables.
-- Not applied to production by this pull request. Do not run it against the live D1 from here.
CREATE TABLE IF NOT EXISTS user_phone (
  user_id INTEGER PRIMARY KEY,
  phone TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS profile_phone (
  email TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS phone_login_lock (
  subject TEXT PRIMARY KEY,
  fails INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  updated_at TEXT NOT NULL
);
