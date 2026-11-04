-- WeChat flow v2 (preview): pending WeChat users get one action (comment OR like); admin reject bans the ID (subs.wx_status='banned').
ALTER TABLE users ADD COLUMN wx_used INTEGER NOT NULL DEFAULT 0;
