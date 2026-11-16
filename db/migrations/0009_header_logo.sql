-- Header logo managed from /admin/customize/logo
-- Timestamps are milliseconds (Date.getTime()), matching the repository layer.
-- The header shows the most recently uploaded logo; when the table is empty it
-- falls back to the built-in logo.
CREATE TABLE
    IF NOT EXISTS header_logo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        media_url TEXT NOT NULL,
        media_type TEXT NOT NULL,
        alt_text TEXT NOT NULL DEFAULT 'Goteo',
        date_created INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
