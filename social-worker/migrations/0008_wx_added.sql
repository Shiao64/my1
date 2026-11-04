-- WeChat flow v3: user pressed 「我已添加」 (sent the 探戈助理 friend request with the code). Unlocks one action; the 3-hour daytime clock starts here.
ALTER TABLE subs ADD COLUMN wx_added_at TEXT;
