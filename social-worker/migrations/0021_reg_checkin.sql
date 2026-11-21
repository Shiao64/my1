-- Door check-in for event registration: one row per person per event item. Additive only.
CREATE TABLE IF NOT EXISTS reg_checkin (
  reg_id INTEGER NOT NULL,
  person INTEGER NOT NULL,      -- index in reg.data.people (0 = the registrant)
  item TEXT NOT NULL,           -- MV, M1..M4, T1, S1, T2, MF
  at TEXT NOT NULL,
  PRIMARY KEY (reg_id, person, item)
);
