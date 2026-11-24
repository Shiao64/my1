-- 2026-11-24 (Shiao): per event, a 总管邮箱 and a 组织者邮箱, set by the 管理员 only.
-- Every registration letter is also sent, as its own separate copy, to each of them (the registrant sees neither).
-- Adds only: the older worker never reads this table, and the newer one works without it (no copies, cannot save).
CREATE TABLE IF NOT EXISTS reg_setting (
  event TEXT NOT NULL,
  key TEXT NOT NULL,          -- chief_email | org_email
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  PRIMARY KEY (event, key)
);
