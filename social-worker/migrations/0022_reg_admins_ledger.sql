-- Registration organizers (each with their own password and permissions) and a payment ledger. Additive only.
CREATE TABLE IF NOT EXISTS reg_admin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  name TEXT NOT NULL,
  pass_hash TEXT NOT NULL,        -- sha256 of the password; the password is shown once
  perms TEXT NOT NULL,            -- comma list: review,collect,cancel,modify,staff,export
  created_at TEXT NOT NULL,
  disabled_at TEXT
);
CREATE INDEX IF NOT EXISTS reg_admin_event ON reg_admin(event);
CREATE TABLE IF NOT EXISTS reg_payment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reg_id INTEGER NOT NULL,
  at TEXT NOT NULL,
  amount INTEGER NOT NULL,        -- CNY; refunds are negative
  method TEXT NOT NULL,           -- wechat, alipay, cash, other
  collector TEXT NOT NULL,        -- who received (or paid back) the money
  note TEXT,
  by_admin TEXT NOT NULL          -- who recorded it
);
CREATE INDEX IF NOT EXISTS reg_payment_reg ON reg_payment(reg_id);
