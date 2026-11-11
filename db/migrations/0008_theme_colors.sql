CREATE TABLE IF NOT EXISTS theme_colors (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    light_colors  TEXT    NOT NULL DEFAULT '{}',
    dark_colors   TEXT    NOT NULL DEFAULT '{}',
    date_updated  INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
