-- 2026-11-25 platform stage 1 (spec v0.6, 「ATM 大型活动报名平台 · 规格书」): an event's settings in the database.
-- Adds only. 北京 (bstw2027) gets no row here, so it keeps the settings written in register.js and behaves as before.
-- config: JSON with the same fields as an entry of EVENTS in register.js (prefix, name, items, pkgs, rules, letters, …).
CREATE TABLE IF NOT EXISTS reg_event (
  id TEXT PRIMARY KEY,                    -- event code used everywhere (reg.event), e.g. yearend2027
  card TEXT,                              -- the ATM card it comes from (asia/events.json id)
  slug TEXT UNIQUE,                       -- its pages: tangoweekend.org/event/<slug>/
  mode TEXT CHECK (mode IN ('test','practice','live')),   -- NULL = follow the site-wide REG_LIVE (as before)
  status TEXT NOT NULL DEFAULT 'prep',    -- prep | open | paused | closed | ended
  config TEXT NOT NULL DEFAULT '{}',
  locked_at TEXT,                         -- 报名表定案: sessions and prices can no longer change
  open_at TEXT, close_at TEXT,            -- registration opens / closes by itself (ISO, UTC)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
