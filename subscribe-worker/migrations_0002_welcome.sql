-- Run before deploying the welcome-email Worker:
-- npx wrangler d1 execute tango-subscribe --remote --file=migrations_0002_welcome.sql
ALTER TABLE subs ADD COLUMN unsubscribed_at TEXT;
ALTER TABLE subs ADD COLUMN welcome_status TEXT;
