-- Home hero block managed from /admin/home/hero
-- Timestamps are milliseconds (Date.getTime()), matching the repository layer.
CREATE TABLE
    IF NOT EXISTS home_hero (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        primary_cta_text TEXT,
        primary_cta_link TEXT,
        secondary_cta_text TEXT,
        secondary_cta_link TEXT,
        media_url TEXT,
        media_type TEXT,
        starts_at INTEGER NOT NULL,
        ends_at INTEGER NOT NULL,
        date_created INTEGER NOT NULL
    );

-- Default hero (image only) until an admin schedules one;
INSERT INTO
    home_hero (
        title,
        content,
        media_url,
        media_type,
        starts_at,
        ends_at,
        date_created
    )
SELECT
    '',
    '',
    '/images/home/hero.png',
    'image/png',
    0,
    253402300799000,
    0 -- ends 9999-12-31
WHERE
    NOT EXISTS (
        SELECT
            1
        FROM
            home_hero
    );
