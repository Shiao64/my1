-- 2026-11-04: subscribe form gets a Name field.
ALTER TABLE email_subs ADD COLUMN name TEXT;
-- zh form: WeChat-only sign-ups (email optional) go to the collect table `subs`.
ALTER TABLE subs ADD COLUMN name TEXT;
-- zh WeChat verification: 4-digit code shown after subscribing; user writes it in the 探戈助理 friend request; admin sets wx_status='verified'.
ALTER TABLE subs ADD COLUMN wx_code TEXT;
ALTER TABLE subs ADD COLUMN wx_status TEXT;  -- NULL (old rows) | 'pending' | 'verified'
ALTER TABLE subs ADD COLUMN wx_verified_at TEXT;
CREATE INDEX IF NOT EXISTS subs_wechat ON subs(wechat, wx_status);
