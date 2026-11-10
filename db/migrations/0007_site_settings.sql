-- Site-wide settings edited from /admin/customize, one JSON document per key
-- (e.g. 'footer'). A missing key means the built-in defaults in code apply.
-- Timestamps are milliseconds (Date.getTime()), matching the repository layer.
CREATE TABLE
    IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        date_updated INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
