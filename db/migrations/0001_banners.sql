-- Home/platform banners managed from /admin/comm
CREATE TABLE IF NOT EXISTS banners (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    -- The row's texts are in `language`; the other locales live in `translations`.
    language    TEXT    NOT NULL DEFAULT 'es',
    title       TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    cta_text    TEXT    NOT NULL,
    cta_link    TEXT    NOT NULL,
    starts_at   INTEGER NOT NULL,
    ends_at     INTEGER NOT NULL,
    -- Milliseconds (Date.getTime()), matching the repository layer.
    date_created  INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- Per-column, per-locale overrides for any table. The base row holds the texts in
-- its own `language`, so rows here only exist for the remaining locales.
CREATE TABLE IF NOT EXISTS translations (
    table_name  TEXT NOT NULL,
    row_id      INTEGER NOT NULL,
    column_name TEXT NOT NULL,
    locale      TEXT NOT NULL,
    value       TEXT NOT NULL,
    PRIMARY KEY (table_name, row_id, column_name, locale)
);
