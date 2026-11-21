-- Event registration (Beijing Select Tango Weekend 2027 first). Additive only: new tables, nothing else changes.
-- One row per registration form. A form can cover the registrant plus up to 5 companions and several hotel rooms;
-- those details live in data (JSON). Amounts are always recomputed on the server.
CREATE TABLE IF NOT EXISTS reg (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,            -- e.g. BJ27-0042, put in the payment note
  user_id INTEGER,                      -- verified subscriber who filled in the form
  email TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'pending',   -- pending, confirmed, waitlist, declined, paid, cash, cancelled
  domestic INTEGER NOT NULL DEFAULT 0,  -- 1 when anyone in the form is from mainland China
  people INTEGER NOT NULL DEFAULT 1,
  data TEXT NOT NULL,
  amount INTEGER NOT NULL,              -- total in CNY, hotel included, fee included
  hotel_amount INTEGER NOT NULL DEFAULT 0,
  fee INTEGER NOT NULL DEFAULT 0,       -- ¥50 handling fee, charged once per registration
  refund INTEGER,
  promo TEXT,
  promo_dj TEXT,
  note TEXT,                            -- organizer's private note
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  confirmed_at TEXT,
  due_at TEXT,
  reminded_at TEXT,
  paid_at TEXT,
  cancelled_at TEXT
);
CREATE INDEX IF NOT EXISTS reg_event_status ON reg(event, status);
CREATE INDEX IF NOT EXISTS reg_email ON reg(event, email);

CREATE TABLE IF NOT EXISTS reg_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reg_id INTEGER NOT NULL,
  at TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT
);

-- Payment QR images for the confirmation letter. Uploaded by the organizer through the admin API, never in the repo.
CREATE TABLE IF NOT EXISTS reg_asset (
  name TEXT PRIMARY KEY,                -- e.g. intl-wechat, intl-alipay, cn-wechat
  mime TEXT NOT NULL,
  data TEXT NOT NULL,                   -- base64
  updated_at TEXT NOT NULL
);
