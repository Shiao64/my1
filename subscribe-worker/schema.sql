CREATE TABLE IF NOT EXISTS subs(
  id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL,
  email TEXT, wechat TEXT, types TEXT NOT NULL, cities TEXT NOT NULL,
  lang TEXT, ip_hash TEXT, is_test INTEGER NOT NULL DEFAULT 0, mail_status TEXT);
CREATE INDEX IF NOT EXISTS subs_ip ON subs(ip_hash, created_at);
