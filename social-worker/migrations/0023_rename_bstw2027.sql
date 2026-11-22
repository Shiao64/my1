-- 2026-11-22: event code bj2027 renamed to bstw2027 (Beijing Select Tango Weekend 2027). Data only; no schema change.
UPDATE reg SET event='bstw2027' WHERE event='bj2027';
UPDATE reg_staff SET event='bstw2027' WHERE event='bj2027';
UPDATE reg_admin SET event='bstw2027' WHERE event='bj2027';
