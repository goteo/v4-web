import { env } from "cloudflare:workers";

import type { BlogSection } from "../utils/blog";

/** Rows of the shared `translations` table that belong to blog posts use this table name. */
const BLOG_POSTS_TABLE = "blog_posts";

/** The texts a post has in each language. Their DB columns have the same names. */
export interface BlogPostTexts {
    title: string;
    subtitle: string | null;
    content: string;
}

const TRANSLATABLE_COLUMNS = ["title", "subtitle", "content"] as const;

/** The stored texts of the languages other than the base one, keyed by locale. */
export type BlogPostTranslations = Record<string, Partial<BlogPostTexts>>;

export interface BlogPostMedia {
    url: string;
    type: string;
}

export interface BlogPostRecord extends BlogPostTexts {
    id: number;
    /** The locale the row's texts are written in; the rest are in `translations`. */
    language: string;
    author: string | null;
    published: boolean;
    publishedAt: Date | null;
    /** Header carousel of images and videos */
    headerMedia: BlogPostMedia[];
    videoUrl: string | null;
    section: BlogSection;
    dateCreated: Date;
    dateUpdated: Date;
}

/** A post with every language it is available in, base one first, and their texts. */
export interface BlogPost extends BlogPostRecord {
    languages: string[];
    translations: BlogPostTranslations;
}

// Without the texts, which getPublished picks per locale.
const META_COLUMNS = `p.id,
                 p.language,
                 p.author,
                 p.published,
                 p.published_at   AS publishedAt,
                 p.header_media   AS headerMedia,
                 p.video_url      AS videoUrl,
                 p.section,
                 p.date_created   AS dateCreated,
                 p.date_updated   AS dateUpdated`;

const COLUMNS = `p.title, p.subtitle, p.content, ${META_COLUMNS}`;

interface BlogPostRow extends Omit<
    BlogPostRecord,
    "published" | "publishedAt" | "headerMedia" | "dateCreated" | "dateUpdated"
> {
    published: number;
    publishedAt: number | null;
    headerMedia: string;
    dateCreated: number;
    dateUpdated: number;
}

interface TranslationRow {
    rowId: number;
    locale: string;
    columnName: (typeof TRANSLATABLE_COLUMNS)[number];
    value: string;
}

/**
 * D1 returns integers for booleans and dates.
 * @param row A raw D1 row
 * @returns The row with real booleans, Dates and arrays
 */
function fromRow(row: BlogPostRow): BlogPostRecord {
    return {
        ...row,
        published: Boolean(row.published),
        publishedAt: row.publishedAt === null ? null : new Date(row.publishedAt),
        headerMedia: JSON.parse(row.headerMedia),
        dateCreated: new Date(row.dateCreated),
        dateUpdated: new Date(row.dateUpdated),
    };
}

/**
 * Attach to each post its stored translations and the languages it is available in.
 * @param rows Raw post rows
 * @param translationRows The `translations` rows of those posts
 * @returns The posts
 */
function withTranslations(rows: BlogPostRow[], translationRows: TranslationRow[]): BlogPost[] {
    const byPost: Record<number, BlogPostTranslations> = {};

    for (const { rowId, locale, columnName, value } of translationRows) {
        byPost[rowId] ??= {};
        byPost[rowId][locale] ??= {};
        byPost[rowId][locale][columnName] = value;
    }

    return rows.map((row) => {
        const translations = byPost[row.id] ?? {};

        return {
            ...fromRow(row),
            languages: [row.language, ...Object.keys(translations)],
            translations,
        };
    });
}

const TRANSLATION_COLUMNS = `row_id AS rowId, locale, column_name AS columnName, value`;

class BlogPostRepository {
    db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    /**
     * Every post with its translations, newest first.
     * @returns All stored posts
     */
    public async getAll(): Promise<BlogPost[]> {
        const [posts, translations] = await this.db.batch([
            this.db.prepare(`SELECT ${COLUMNS} FROM blog_posts p ORDER BY p.id DESC`),
            this.db
                .prepare(`SELECT ${TRANSLATION_COLUMNS} FROM translations WHERE table_name = ?`)
                .bind(BLOG_POSTS_TABLE),
        ]);

        return withTranslations(
            posts.results as BlogPostRow[],
            translations.results as TranslationRow[],
        );
    }

    /**
     * One page of published posts, newest first, with their texts in the given locale
     * where translated and in their base language otherwise.
     * @param locale The locale to show the texts in
     * @param options Section to filter by, 1-based page and page size
     * @returns The page of posts and the total of published posts matching
     */
    public async getPublished(
        locale: string,
        { section, page, perPage }: { section: BlogSection | null; page: number; perPage: number },
    ): Promise<{ posts: BlogPostRecord[]; total: number }> {
        const where = "WHERE p.published = 1 AND (?1 IS NULL OR p.section = ?1)";

        // One join per translatable column; each falls back to the row's own text.
        const joins = TRANSLATABLE_COLUMNS.map(
            (column) =>
                `LEFT JOIN translations t_${column}
                   ON t_${column}.table_name = ?2 AND t_${column}.row_id = p.id
                  AND t_${column}.column_name = '${column}' AND t_${column}.locale = ?3`,
        ).join("\n");

        const [posts, count] = await this.db.batch([
            this.db
                .prepare(
                    `SELECT ${META_COLUMNS},
                            COALESCE(t_title.value, p.title)       AS title,
                            COALESCE(t_subtitle.value, p.subtitle) AS subtitle,
                            COALESCE(t_content.value, p.content)   AS content
                     FROM blog_posts p
                     ${joins}
                     ${where}
                     ORDER BY p.published_at DESC, p.id DESC
                     LIMIT ?4 OFFSET ?5`,
                )
                .bind(section, BLOG_POSTS_TABLE, locale, perPage, (page - 1) * perPage),
            this.db.prepare(`SELECT COUNT(*) AS total FROM blog_posts p ${where}`).bind(section),
        ]);

        return {
            posts: (posts.results as BlogPostRow[]).map(fromRow),
            total: (count.results[0] as { total: number }).total,
        };
    }

    /**
     * One post with all its translations.
     * @param id The post to load
     * @returns The post, or null when it does not exist
     */
    public async getById(id: number): Promise<BlogPost | null> {
        const [post, translations] = await this.db.batch([
            this.db.prepare(`SELECT ${COLUMNS} FROM blog_posts p WHERE p.id = ?`).bind(id),
            this.db
                .prepare(
                    `SELECT ${TRANSLATION_COLUMNS}
                     FROM translations
                     WHERE table_name = ? AND row_id = ?`,
                )
                .bind(BLOG_POSTS_TABLE, id),
        ]);

        const [found] = withTranslations(
            post.results as BlogPostRow[],
            translations.results as TranslationRow[],
        );

        return found ?? null;
    }

    /**
     * Create or update a post and replace its translations, atomically.
     * @param id The post to update, or null to create it
     * @param post The post, with its texts in `post.language`
     * @param translations The texts of every other language
     * @returns The post id
     */
    public async save(
        id: number | null,
        post: Omit<BlogPostRecord, "id" | "dateCreated" | "dateUpdated">,
        translations: BlogPostTranslations,
    ): Promise<number> {
        const now = Date.now();
        const values = [
            post.language,
            post.title,
            post.subtitle,
            post.content,
            post.author,
            Number(post.published),
            post.publishedAt?.getTime() ?? null,
            JSON.stringify(post.headerMedia),
            post.videoUrl,
            post.section,
            now,
        ];

        const upsertPost =
            id === null
                ? this.db
                      .prepare(
                          `INSERT INTO blog_posts (
                            language, title, subtitle, content, author, published, published_at,
                            header_media, video_url, section, date_updated,
                            date_created
                         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                         RETURNING id`,
                      )
                      .bind(...values, now)
                : this.db
                      .prepare(
                          `UPDATE blog_posts SET
                            language = ?, title = ?, subtitle = ?, content = ?, author = ?,
                            published = ?, published_at = ?, header_media = ?, video_url = ?,
                            section = ?, date_updated = ?
                         WHERE id = ?
                         RETURNING id`,
                      )
                      .bind(...values, id);

        // A batch runs as one transaction, so a new post is the newest row of the table.
        const postId = "COALESCE(?, (SELECT MAX(id) FROM blog_posts))";

        // Languages dropped in the editor must not keep their old texts.
        const clearTexts = this.db
            .prepare(`DELETE FROM translations WHERE table_name = ? AND row_id = ${postId}`)
            .bind(BLOG_POSTS_TABLE, id);

        // Selected from blog_posts so an id that does not exist inserts nothing.
        const insertText = this.db.prepare(
            `INSERT INTO translations (table_name, row_id, column_name, locale, value)
             SELECT ?, id, ?, ?, ? FROM blog_posts WHERE id = ${postId}`,
        );

        const insertTexts = Object.entries(translations).flatMap(([locale, texts]) =>
            TRANSLATABLE_COLUMNS.filter((column) => texts[column]).map((column) =>
                insertText.bind(BLOG_POSTS_TABLE, column, locale, texts[column], id),
            ),
        );

        const [result] = await this.db.batch<{ id: number }>([
            upsertPost,
            clearTexts,
            ...insertTexts,
        ]);
        const saved = result.results[0];

        if (!saved) {
            throw new Error(`Blog post ${id} not found`);
        }

        return saved.id;
    }

    /**
     * Publish or unpublish a post. Publishing an undated post dates it now.
     * @param id The post to change
     * @param published The new state
     */
    public async setPublished(id: number, published: boolean): Promise<void> {
        const result = await this.db
            .prepare(
                `UPDATE blog_posts
                 SET published = ?,
                     published_at = CASE WHEN ? THEN COALESCE(published_at, ?) ELSE published_at END,
                     date_updated = ?
                 WHERE id = ?`,
            )
            .bind(Number(published), Number(published), Date.now(), Date.now(), id)
            .run();

        if (result.error) {
            throw new Error(result.error);
        }
    }
}

export const blogPostRepository = new BlogPostRepository(env.DB);
