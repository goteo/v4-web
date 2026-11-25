-- Blog posts can be linked to the API's categories and themes, so resources can be
-- classified and tagged. Both columns hold a JSON array of API identifiers.
ALTER TABLE blog_posts ADD COLUMN category_ids TEXT NOT NULL DEFAULT '[]';
ALTER TABLE blog_posts ADD COLUMN theme_ids TEXT NOT NULL DEFAULT '[]';

-- Plain text derived from the Markdown body, so cards do not have to parse it on the server.
ALTER TABLE blog_posts ADD COLUMN excerpt TEXT NOT NULL DEFAULT '';

-- The home and the blog read the latest published posts of a section.
CREATE INDEX IF NOT EXISTS idx_blog_posts_section_published
    ON blog_posts(section, published, published_at DESC);
