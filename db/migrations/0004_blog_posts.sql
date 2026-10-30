-- Blog posts managed from /admin/comm/blog
-- Timestamps are milliseconds (Date.getTime()), matching the repository layer.
-- Like home_hero, the row holds the texts in the locale it was written in (`language`);
-- the other locales live in the shared `translations` table, one row per column.
CREATE TABLE
    IF NOT EXISTS blog_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        language TEXT NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT,
        content TEXT NOT NULL DEFAULT '',
        author TEXT,
        published INTEGER NOT NULL DEFAULT 0,
        published_at INTEGER,
        -- Header carousel: JSON array of { url, type } images and videos
        header_media TEXT NOT NULL DEFAULT '[]',
        video_url TEXT,
        section TEXT NOT NULL DEFAULT 'news' CHECK (
            section IN ('news', 'stories', 'resources', 'newsletter')
        ),
        date_created INTEGER NOT NULL DEFAULT (unixepoch () * 1000),
        date_updated INTEGER NOT NULL DEFAULT (unixepoch () * 1000)
    );
