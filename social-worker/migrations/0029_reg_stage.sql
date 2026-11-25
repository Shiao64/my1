-- 2026-11-25 platform step 5 (实习, Drive 《TP 实习方案（v2）》, spec v0.6 「清空与感谢信」): which registrations are practice or
-- test data, so 「结束实习并清空」 deletes only those (with their payments, check-ins and records).
--   practice = made with the 实习报名链接 while the event is in 实习 (numbered <prefix>P-0001)
--   test     = made while a platform event is in 测试
--   empty    = real
-- Adds only. The older worker never reads it; the newer one works without it (nothing marked, no 实习 until it is run).
ALTER TABLE reg ADD COLUMN stage TEXT;
CREATE INDEX IF NOT EXISTS reg_event_stage ON reg(event, stage);
