-- The hero base row can be written in any of the supported locales (the admin
-- UI language at save time), so record which one it is. Translation rows in the
-- `translations` table cover the remaining locales.
ALTER TABLE home_hero ADD COLUMN language TEXT NOT NULL DEFAULT '';

UPDATE home_hero
SET language = 'es'
WHERE language = ''
  AND title = '';