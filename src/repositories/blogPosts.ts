import { env } from "cloudflare:workers";

import { BLOG_BASE_LOCALE } from "../utils/blog";

import type { Locale } from "../i18n/locales";
import type { BlogSection } from "../utils/blog";

export interface BlogPostRecord {
    id: number;
    author: string | null;
    published: boolean;
    publishedAt: Date | null;
    /** Header image or video */
    headerUrl: string | null;
    headerType: string | null;
    videoUrl: string | null;
    section: BlogSection;
    allowComments: boolean;
    dateCreated: Date;
    dateUpdated: Date;
}

export interface BlogPostTranslation {
    title: string;
    subtitle: string | null;
    content: string;
}

/** A post with its base locale texts and the locales it has been written in. */
export type BlogPostListItem = BlogPostRecord & BlogPostTranslation & { locales: Locale[] };

export type BlogPostDetail = BlogPostRecord & {
    translations: Partial<Record<Locale, BlogPostTranslation>>;
};

const COLUMNS = `p.id,
                 p.author,
                 p.published,
                 p.published_at   AS publishedAt,
                 p.header_url     AS headerUrl,
                 p.header_type    AS headerType,
                 p.video_url      AS videoUrl,
                 p.section,
                 p.allow_comments AS allowComments,
                 p.date_created   AS dateCreated,
                 p.date_updated   AS dateUpdated`;

interface BlogPostRow extends Omit<
    BlogPostRecord,
    "published" | "publishedAt" | "allowComments" | "dateCreated" | "dateUpdated"
> {
    published: number;
    publishedAt: number | null;
    allowComments: number;
    dateCreated: number;
    dateUpdated: number;
}

/**
 * D1 returns integers for booleans and dates.
 * @param row A raw D1 row
 * @returns The row with real booleans, Dates and arrays
 */
function fromRow(row: BlogPostRow): BlogPostRecord {
    return {
        id: row.id,
        author: row.author,
        published: Boolean(row.published),
        publishedAt: row.publishedAt === null ? null : new Date(row.publishedAt),
        headerUrl: row.headerUrl,
        headerType: row.headerType,
        videoUrl: row.videoUrl,
        section: row.section,
        allowComments: Boolean(row.allowComments),
        dateCreated: new Date(row.dateCreated),
        dateUpdated: new Date(row.dateUpdated),
    };
}

class BlogPostRepository {
    db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    /**
     * Every post with its base locale texts, newest first.
     * @returns All stored posts
     */
    public async getAll(): Promise<BlogPostListItem[]> {
        const { results } = await this.db
            .prepare(
                `SELECT ${COLUMNS},
                        base.title,
                        base.subtitle,
                        base.content,
                        (SELECT GROUP_CONCAT(locale)
                         FROM blog_post_translations
                         WHERE post_id = p.id) AS locales
                 FROM blog_posts p
                 LEFT JOIN blog_post_translations base
                        ON base.post_id = p.id AND base.locale = ?
                 ORDER BY p.id DESC`,
            )
            .bind(BLOG_BASE_LOCALE)
            .all<BlogPostRow & BlogPostTranslation & { locales: string | null }>();

        return results.map((row) => ({
            ...fromRow(row),
            title: row.title ?? "",
            subtitle: row.subtitle,
            content: row.content ?? "",
            locales: (row.locales?.split(",") ?? []) as Locale[],
        }));
    }

    /**
     * One post with all its translations.
     * @param id The post to load
     * @returns The post, or null when it does not exist
     */
    public async getById(id: number): Promise<BlogPostDetail | null> {
        const [post, translations] = await this.db.batch([
            this.db.prepare(`SELECT ${COLUMNS} FROM blog_posts p WHERE p.id = ?`).bind(id),
            this.db
                .prepare(
                    `SELECT locale, title, subtitle, content
                     FROM blog_post_translations
                     WHERE post_id = ?`,
                )
                .bind(id),
        ]);

        const row = post.results[0] as BlogPostRow | undefined;

        if (!row) {
            return null;
        }

        const rows = translations.results as (BlogPostTranslation & { locale: Locale })[];

        return {
            ...fromRow(row),
            translations: Object.fromEntries(rows.map(({ locale, ...texts }) => [locale, texts])),
        };
    }

    /**
     * Create or update a post and the texts of its locales, atomically.
     * @param id The post to update, or null to create it
     * @param post The shared, non-translatable fields
     * @param translations The translatable fields, per locale
     * @returns The post id
     */
    public async save(
        id: number | null,
        post: Omit<BlogPostRecord, "id" | "dateCreated" | "dateUpdated">,
        translations: Partial<Record<Locale, BlogPostTranslation>>,
    ): Promise<number> {
        const now = Date.now();
        const values = [
            post.author,
            Number(post.published),
            post.publishedAt?.getTime() ?? null,
            post.headerUrl,
            post.headerType,
            post.videoUrl,
            post.section,
            Number(post.allowComments),
            now,
        ];

        const upsertPost =
            id === null
                ? this.db
                      .prepare(
                          `INSERT INTO blog_posts (
                            author, published, published_at, header_url, header_type,
                            video_url, section, allow_comments, date_updated, date_created
                         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                         RETURNING id`,
                      )
                      .bind(...values, now)
                : this.db
                      .prepare(
                          `UPDATE blog_posts SET
                            author = ?, published = ?, published_at = ?, header_url = ?,
                            header_type = ?, video_url = ?, section = ?,
                            allow_comments = ?, date_updated = ?
                         WHERE id = ?
                         RETURNING id`,
                      )
                      .bind(...values, id);

        // A batch runs as one transaction, and the translations table is WITHOUT ROWID,
        // so last_insert_rowid() stays the post just inserted.
        const upsertTexts = Object.entries(translations).map(([locale, texts]) =>
            this.db
                .prepare(
                    `INSERT INTO blog_post_translations (post_id, locale, title, subtitle, content)
                     VALUES (COALESCE(?, last_insert_rowid()), ?, ?, ?, ?)
                     ON CONFLICT (post_id, locale) DO UPDATE SET
                        title = excluded.title,
                        subtitle = excluded.subtitle,
                        content = excluded.content`,
                )
                .bind(id, locale, texts.title, texts.subtitle, texts.content),
        );

        const [result] = await this.db.batch<{ id: number }>([upsertPost, ...upsertTexts]);
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
