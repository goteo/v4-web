-- FAQs managed from /admin/comm/faqs
-- Timestamps are milliseconds (Date.getTime()), matching the repository layer.
-- The row holds the texts in the locale it was written in (`language`);
-- the other locales live in the shared `translations` table, one row per column.
CREATE TABLE
    IF NOT EXISTS faqs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position INTEGER NOT NULL DEFAULT 0,
        language TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        date_updated INTEGER NOT NULL DEFAULT (unixepoch () * 1000)
    );
