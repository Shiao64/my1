-- 2026-11-25 platform stage 2 (spec v0.6 「一人多场」): one person, roles in several events, one link and one password.
-- A person's first role (the "home" row, as before) keeps the sign-in: link, password, tries, lock, phones.
-- A role in another event is attached to that person: person_id = '<admin|staff>:<home id>', and no sign-in of its own.
-- email: given at an appointment, to recognise the same person in the next event.
-- Adds only. Rows without person_id behave exactly as before; the older worker ignores both columns
-- (an attached role would show there as "no link yet" until reset).
ALTER TABLE reg_admin ADD COLUMN person_id TEXT;
ALTER TABLE reg_admin ADD COLUMN email TEXT;
ALTER TABLE reg_staff ADD COLUMN person_id TEXT;
ALTER TABLE reg_staff ADD COLUMN email TEXT;
CREATE INDEX IF NOT EXISTS reg_admin_person ON reg_admin(person_id);
CREATE INDEX IF NOT EXISTS reg_staff_person ON reg_staff(person_id);
CREATE INDEX IF NOT EXISTS reg_admin_email ON reg_admin(email);
CREATE INDEX IF NOT EXISTS reg_staff_email ON reg_staff(email);
