import { env } from "cloudflare:workers";

export interface HomeHeroRecord {
    id: number;
    title: string;
    content: string;
    primaryCtaText: string | null;
    primaryCtaLink: string | null;
    secondaryCtaText: string | null;
    secondaryCtaLink: string | null;
    /**
     * Image or video shown next to the text. The home renders it in a 668x510
     * box (`aspect-668/510`, ~4:3).
     */
    mediaUrl: string | null;
    mediaType: string | null;
    startsAt: Date;
    dateCreated: Date;
}

const COLUMNS = `id,
                 title,
                 content,
                 primary_cta_text   AS primaryCtaText,
                 primary_cta_link   AS primaryCtaLink,
                 secondary_cta_text AS secondaryCtaText,
                 secondary_cta_link AS secondaryCtaLink,
                 media_url          AS mediaUrl,
                 media_type         AS mediaType,
                 starts_at          AS startsAt,
                 date_created       AS dateCreated`;

/**
 * Dates come back as the stored millisecond integers.
 * @param row A raw D1 row
 * @returns The row with real Date instances
 */
function fromRow(row: HomeHeroRecord): HomeHeroRecord {
    return {
        ...row,
        startsAt: new Date(row.startsAt),
        dateCreated: new Date(row.dateCreated),
    };
}

class HomeHeroRepository {
    db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    /**
     * Every hero ever scheduled, most recently authored first.
     * @returns All stored heroes
     */
    public async getAll(): Promise<HomeHeroRecord[]> {
        const { results } = await this.db
            .prepare(
                `SELECT ${COLUMNS}
                 FROM home_hero
                 ORDER BY date_created DESC`,
            )
            .all<HomeHeroRecord>();

        return results.map(fromRow);
    }

    /**
     * The hero whose start date has already passed, most recently authored first.
     * @returns The active hero, or null when nothing is scheduled yet
     */
    public async getActive(): Promise<HomeHeroRecord | null> {
        const now = Date.now();

        const row = await this.db
            .prepare(
                `SELECT ${COLUMNS}
                 FROM home_hero
                 WHERE starts_at <= ?
                 ORDER BY date_created DESC
                 LIMIT 1`,
            )
            .bind(now)
            .first<HomeHeroRecord>();

        return row ? fromRow(row) : null;
    }

    /**
     * Store a new hero block.
     * @param hero The hero to store
     */
    public async create(hero: Omit<HomeHeroRecord, "id">): Promise<void> {
        const result = await this.db
            .prepare(
                `INSERT INTO home_hero (
                    title,
                    content,
                    primary_cta_text,
                    primary_cta_link,
                    secondary_cta_text,
                    secondary_cta_link,
                    media_url,
                    media_type,
                    starts_at,
                    date_created
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
                hero.title,
                hero.content,
                hero.primaryCtaText,
                hero.primaryCtaLink,
                hero.secondaryCtaText,
                hero.secondaryCtaLink,
                hero.mediaUrl,
                hero.mediaType,
                hero.startsAt.getTime(),
                hero.dateCreated.getTime(),
            )
            .run();

        if (result.error) {
            throw new Error(result.error);
        }
    }

    /**
     * Remove a hero block.
     * @param id The hero to remove
     */
    public async delete(id: number): Promise<void> {
        await this.db.prepare(`DELETE FROM home_hero WHERE id = ?`).bind(id).run();
    }
}

export const homeHeroRepository = new HomeHeroRepository(env.DB);
