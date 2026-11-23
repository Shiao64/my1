-- 2026-11-23 (Shiao): no more 现场经理; 副总管 is renamed 经理, same rights, still three at most per event.
-- Everyone who is still a 现场经理 becomes 经理 and keeps the link, the password and the signed-in phones.
-- Before running on the live database: check that no event would go over three 经理.
UPDATE reg_admin SET perms='deputy' WHERE perms NOT IN ('chief','deputy');
