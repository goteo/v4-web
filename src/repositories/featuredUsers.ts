import { env } from "cloudflare:workers";

/** A featured user as authored by an admin, before it is stored. */
export interface FeaturedUserInput {
    userId: number;
}

export interface FeaturedUserRecord extends FeaturedUserInput {
    id: number;
    position: number;
    dateCreated: Date;
    dateUpdated: Date;
}

const COLUMNS = `id,
                 position,
                 user_id   AS userId,
                 date_created AS dateCreated,
                 date_updated AS dateUpdated`;

/**
 * Dates come back as the stored millisecond integers, and the user id as the stored text.
 * @param row A raw D1 row
 * @returns The row with real Date instances
 */
function fromRow(row: FeaturedUserRecord): FeaturedUserRecord {
    return {
        ...row,
        userId: Number(row.userId),
        dateCreated: new Date(row.dateCreated),
        dateUpdated: new Date(row.dateUpdated),
    };
}

class FeaturedUserRepository {
    db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    /**
     * The users featured on the home page, in the order they are displayed.
     * @returns The stored featured users, or an empty list when none is set
     */
    public async getAll(): Promise<FeaturedUserRecord[]> {
        const { results } = await this.db
            .prepare(
                `SELECT ${COLUMNS}
                 FROM featured_users
                 ORDER BY position ASC`,
            )
            .all<FeaturedUserRecord>();

        return results.map(fromRow);
    }

    /**
     * Replaces the whole set of featured users with the given ones. `db.batch()` runs as a
     * single SQL transaction, so a failing insert rolls back the previous set too.
     * @param users The users to feature, in the order they should appear
     */
    public async save(users: FeaturedUserInput[]): Promise<void> {
        const now = Date.now();

        const deletePrevious = this.db.prepare(`DELETE FROM featured_users`);
        const insert = this.db.prepare(
            `INSERT INTO featured_users (position, user_id, date_created, date_updated)
             VALUES (?, ?, ?, ?)`,
        );

        const statements = users.map((user, position) =>
            insert.bind(position, String(user.userId), now, now),
        );

        const results = await this.db.batch([deletePrevious, ...statements]);

        const failed = results.find((r) => r.error);
        if (failed?.error) {
            throw new Error(failed.error);
        }
    }
}

export const featuredUserRepository = new FeaturedUserRepository(env.DB);
