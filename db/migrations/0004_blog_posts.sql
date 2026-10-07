-- Blog posts managed from /admin/comm/blog
-- Timestamps are milliseconds (Date.getTime()), matching the repository layer.
CREATE TABLE
    IF NOT EXISTS blog_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author TEXT,
        published INTEGER NOT NULL DEFAULT 0,
        published_at INTEGER,
        header_url TEXT,
        header_type TEXT,
        video_url TEXT,
        section TEXT NOT NULL DEFAULT 'news' CHECK (
            section IN ('news', 'stories', 'resources', 'newsletter')
        ),
        allow_comments INTEGER NOT NULL DEFAULT 1,
        date_created INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        date_updated INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

-- Translatable texts, one row per locale. Every post has at least its es row.
-- WITHOUT ROWID so inserting here leaves last_insert_rowid() pointing at the post.
CREATE TABLE
    IF NOT EXISTS blog_post_translations (
        post_id INTEGER NOT NULL REFERENCES blog_posts (id) ON DELETE CASCADE,
        locale TEXT NOT NULL CHECK (locale IN ('es', 'en', 'ca')),
        title TEXT NOT NULL,
        subtitle TEXT,
        content TEXT NOT NULL DEFAULT '',
        PRIMARY KEY (post_id, locale)
    ) WITHOUT ROWID;
