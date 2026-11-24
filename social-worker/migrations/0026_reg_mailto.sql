-- 2026-11-24 (Shiao): 活动邮箱, per event, changed by the 管理员 only (docs/tangopass.md).
-- Every registration letter and the 新报名 notice also go, each as a separate letter, to the 总管邮箱, the 副本邮箱 and the
-- 管理员 (the registrant sees none of them).
-- Adds only: the older worker never reads this table, and the newer one works without it (cannot save; the 管理员 gets everything).
-- Ran on the live database 2026-11-24 (its stored comment below still says org_email: the key was renamed copy_email before deploy).
CREATE TABLE IF NOT EXISTS reg_setting (
  event TEXT NOT NULL,
  key TEXT NOT NULL,          -- chief_email | copy_email | admin_copy ('0' = off) | chief_token | chief_verified
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  PRIMARY KEY (event, key)
);
