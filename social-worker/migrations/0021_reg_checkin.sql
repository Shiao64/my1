-- Door check-in for event registration. Additive only.
-- reg_checkin: one row per person per event item. reg_staff: door helpers, each with a one-phone link.
CREATE TABLE IF NOT EXISTS reg_checkin (
  reg_id INTEGER NOT NULL,
  person INTEGER NOT NULL,      -- index in reg.data.people (0 = the registrant)
  item TEXT NOT NULL,           -- MV, M1..M4, T1, S1, T2, MF
  at TEXT NOT NULL,
  staff TEXT,                   -- who scanned: helper name, or 主办
  PRIMARY KEY (reg_id, person, item)
);
CREATE TABLE IF NOT EXISTS reg_staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  name TEXT NOT NULL,
  act_hash TEXT,                -- one-time activation link (sha256); cleared once used
  device_hash TEXT,             -- token kept on the helper's phone (sha256)
  created_at TEXT NOT NULL,
  activated_at TEXT,
  disabled_at TEXT
);
CREATE INDEX IF NOT EXISTS reg_staff_event ON reg_staff(event);
