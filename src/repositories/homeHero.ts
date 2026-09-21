import { env } from "cloudflare:workers";

export interface HomeHeroRecord {
    id: number;
    title: string;
    content: string;
    primaryCtaText: string | null;
    primaryCtaLink: string | null;
    secondaryCtaText: string | null;
    secondaryCtaLink: string | null;
    mediaUrl: string | null;
    mediaType: string | null;
    startsAt: Date;
    endsAt: Date;
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
                 ends_at            AS endsAt,
                 date_created       AS dateCreated`;

class HomeHeroRepository {
    db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    /**
     * The hero scheduled for right now, most recently authored first.
     * @returns The active hero, or null when nothing is scheduled
     */
    public async getActive(): Promise<HomeHeroRecord | null> {
        const now = Date.now();

        const row = await this.db
            .prepare(
                `SELECT ${COLUMNS}
                 FROM home_hero
                 WHERE starts_at <= ? AND ends_at >= ?
                 ORDER BY date_created DESC
                 LIMIT 1`,
            )
            .bind(now, now)
            .first<HomeHeroRecord>();

        if (!row) {
            return null;
        }

        // Dates come back as the stored millisecond integers.
        return {
            ...row,
            startsAt: new Date(row.startsAt),
            endsAt: new Date(row.endsAt),
            dateCreated: new Date(row.dateCreated),
        };
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
                    ends_at,
                    date_created
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                hero.endsAt.getTime(),
                hero.dateCreated.getTime(),
            )
            .run();

        if (result.error) {
            throw new Error(result.error);
        }
    }
}

export const homeHeroRepository = new HomeHeroRepository(env.DB);
