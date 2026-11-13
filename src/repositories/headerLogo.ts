import { env } from "cloudflare:workers";

export interface HeaderLogoRecord {
    id: number;
    /** URL of the uploaded image file. */
    mediaUrl: string;
    mediaType: string;
    /** Alternative text for the header image. */
    altText: string;
    dateCreated: Date;
}

const COLUMNS = `id,
                 media_url    AS mediaUrl,
                 media_type   AS mediaType,
                 alt_text     AS altText,
                 date_created AS dateCreated`;

/**
 * Dates come back as the stored millisecond integers.
 * @param row A raw D1 row
 * @returns The row with real Date instances
 */
function fromRow(row: HeaderLogoRecord): HeaderLogoRecord {
    return {
        ...row,
        dateCreated: new Date(row.dateCreated),
    };
}

class HeaderLogoRepository {
    db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    /**
     * Every logo ever uploaded, most recently authored first.
     * @returns All stored logos
     */
    public async getAll(): Promise<HeaderLogoRecord[]> {
        const { results } = await this.db
            .prepare(
                `SELECT ${COLUMNS}
                 FROM header_logo
                 ORDER BY date_created DESC, id DESC`,
            )
            .all<HeaderLogoRecord>();

        return results.map(fromRow);
    }

    /**
     * The most recently uploaded logo, the one the header shows.
     * @returns The active logo, or null while none has been uploaded
     */
    public async getActive(): Promise<HeaderLogoRecord | null> {
        const row = await this.db
            .prepare(
                `SELECT ${COLUMNS}
                 FROM header_logo
                 ORDER BY date_created DESC, id DESC
                 LIMIT 1`,
            )
            .first<HeaderLogoRecord>();

        return row ? fromRow(row) : null;
    }

    /**
     * Store a new logo version.
     * @param logo The logo to store
     * @returns The id of the newly created logo
     */
    public async create(logo: Omit<HeaderLogoRecord, "id">): Promise<number> {
        const result = await this.db
            .prepare(
                `INSERT INTO header_logo (
                    media_url,
                    media_type,
                    alt_text,
                    date_created
                 ) VALUES (?, ?, ?, ?)`,
            )
            .bind(logo.mediaUrl, logo.mediaType, logo.altText, logo.dateCreated.getTime())
            .run();

        if (result.error) {
            throw new Error(result.error);
        }

        return Number(result.meta.last_row_id);
    }

    /**
     * Remove a logo version.
     * @param id The logo to remove
     */
    public async delete(id: number): Promise<void> {
        await this.db.prepare(`DELETE FROM header_logo WHERE id = ?`).bind(id).run();
    }
}

export const headerLogoRepository = new HeaderLogoRepository(env.DB);
