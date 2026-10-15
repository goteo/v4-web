-- Featured users block rendered on the home page, curated from /admin/home/featured-users
-- The user reference drives identity: displayName, handle and avatar are resolved from the
-- API, so they never go stale here. The card image is always the user avatar.
-- Timestamps are milliseconds (Date.getTime()), matching the repository layer.
CREATE TABLE
    IF NOT EXISTS featured_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        date_created INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        date_updated INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        UNIQUE (position)
    );

