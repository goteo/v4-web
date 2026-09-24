import { env } from "cloudflare:workers";

/**
 * Per-column, per-locale overrides for any table. The base row always holds the
 * default locale, so rows here only exist for the remaining locales. See
 * `db/migrations/0001_banners.sql`.
 */

export interface TranslationRecord {
    tableName: string;
    rowId: number;
    columnName: string;
    locale: string;
    value: string;
}

/** The home_hero columns that may be translated. `column_name` = DB column. */
export const HOME_HERO_TABLE = "home_hero";

export const HOME_HERO_TRANSLATABLE_COLUMNS = [
    "title",
    "content",
    "primary_cta_text",
    "primary_cta_link",
    "secondary_cta_text",
    "secondary_cta_link",
] as const;

/** Maps a DB column back to the camelCase property of `HomeHeroRecord`. */
export const HOME_HERO_COLUMN_TO_PROPERTY: Record<
    (typeof HOME_HERO_TRANSLATABLE_COLUMNS)[number],
    string
> = {
    title: "title",
    content: "content",
    primary_cta_text: "primaryCtaText",
    primary_cta_link: "primaryCtaLink",
    secondary_cta_text: "secondaryCtaText",
    secondary_cta_link: "secondaryCtaLink",
};

class TranslationRepository {
    db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    /**
     * The stored translations of one row for one locale.
     * @returns A map of DB column name to translated value
     */
    public async get(
        tableName: string,
        rowId: number,
        locale: string,
        columns: readonly string[],
    ): Promise<Record<string, string>> {
        if (columns.length === 0) {
            return {};
        }

        const placeholders = columns.map(() => "?").join(", ");

        const { results } = await this.db
            .prepare(
                `SELECT column_name, value
                 FROM translations
                 WHERE table_name = ? AND row_id = ? AND locale = ?
                   AND column_name IN (${placeholders})`,
            )
            .bind(tableName, rowId, locale, ...columns)
            .all<{ column_name: string; value: string }>();

        return Object.fromEntries(results.map((r) => [r.column_name, r.value]));
    }

    /**
     * Upsert translation values for a single row and locale.
     * @param values A map of DB column name to translated value
     */
    public async set(
        tableName: string,
        rowId: number,
        locale: string,
        values: Record<string, string>,
    ): Promise<void> {
        const stmt = this.db.prepare(
            `INSERT INTO translations (table_name, row_id, column_name, locale, value)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT (table_name, row_id, column_name, locale)
             DO UPDATE SET value = excluded.value`,
        );

        await this.db.batch(
            Object.entries(values).map(([columnName, value]) =>
                stmt.bind(tableName, rowId, columnName, locale, value),
            ),
        );
    }
}

export const translationRepository = new TranslationRepository(env.DB);
