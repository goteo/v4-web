import { env } from "cloudflare:workers";

/** Rows of the shared `translations` table that belong to banners use this table name. */
const BANNERS_TABLE = "banners";

/** The texts a banner has in each language. */
export interface BannerTexts {
    title: string;
    content: string;
    ctaText: string;
    ctaLink: string;
}

/** The DB column of each translatable text. */
const TRANSLATABLE_COLUMNS = {
    title: "title",
    content: "content",
    ctaText: "cta_text",
    ctaLink: "cta_link",
} as const satisfies Record<keyof BannerTexts, string>;

/** The stored texts of the languages other than the base one, keyed by locale. */
export type BannerTranslations = Record<string, Partial<BannerTexts>>;

export interface BannerRecord extends BannerTexts {
    id: number;
    /** The locale the row's texts are written in; the rest are in `translations`. */
    language: string;
    startsAt: Date;
    endsAt: Date;
    dateCreated: Date;
}

/** A banner with every language it is available in, base one first, and their texts. */
export interface Banner extends BannerRecord {
    languages: string[];
    translations: BannerTranslations;
}

// Without the texts, which getActive picks per locale.
const META_COLUMNS = `b.id,
                 b.language,
                 b.starts_at    AS startsAt,
                 b.ends_at      AS endsAt,
                 b.date_created AS dateCreated`;

const COLUMNS = `b.title, b.content, b.cta_text AS ctaText, b.cta_link AS ctaLink, ${META_COLUMNS}`;

interface BannerRow extends Omit<BannerRecord, "startsAt" | "endsAt" | "dateCreated"> {
    startsAt: number;
    endsAt: number;
    dateCreated: number;
}

interface TranslationRow {
    rowId: number;
    locale: string;
    property: keyof BannerTexts;
    value: string;
}

/**
 * D1 returns integers for dates.
 * @param row A raw D1 row
 * @returns The row with real Dates
 */
function fromRow(row: BannerRow): BannerRecord {
    return {
        ...row,
        startsAt: new Date(row.startsAt),
        endsAt: new Date(row.endsAt),
        dateCreated: new Date(row.dateCreated),
    };
}

/**
 * Attach to each banner its stored translations and the languages it is available in.
 * @param rows Raw banner rows
 * @param translationRows The `translations` rows of those banners
 * @returns The banners
 */
function withTranslations(rows: BannerRow[], translationRows: TranslationRow[]): Banner[] {
    const byBanner: Record<number, BannerTranslations> = {};

    for (const { rowId, locale, property, value } of translationRows) {
        byBanner[rowId] ??= {};
        byBanner[rowId][locale] ??= {};
        byBanner[rowId][locale][property] = value;
    }

    return rows.map((row) => {
        const translations = byBanner[row.id] ?? {};

        return {
            ...fromRow(row),
            languages: [row.language, ...Object.keys(translations)],
            translations,
        };
    });
}

// Maps the DB column back to the BannerTexts property.
const TRANSLATION_COLUMNS = `row_id AS rowId, locale, value,
    CASE column_name ${Object.entries(TRANSLATABLE_COLUMNS)
        .map(([property, column]) => `WHEN '${column}' THEN '${property}'`)
        .join(" ")} END AS property`;

class BannerRepository {
    db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    /**
     * Every banner with its translations, newest first.
     * @returns All stored banners
     */
    public async getAll(): Promise<Banner[]> {
        const [banners, translations] = await this.db.batch([
            this.db.prepare(`SELECT ${COLUMNS} FROM banners b ORDER BY b.date_created DESC`),
            this.db
                .prepare(`SELECT ${TRANSLATION_COLUMNS} FROM translations WHERE table_name = ?`)
                .bind(BANNERS_TABLE),
        ]);

        return withTranslations(
            banners.results as BannerRow[],
            translations.results as TranslationRow[],
        );
    }

    /**
     * The banners running now, with their texts in the given locale where translated
     * and in their base language otherwise.
     * @param locale The locale to show the texts in
     * @returns The active banners, newest first
     */
    public async getActive(locale: string): Promise<BannerRecord[]> {
        const now = Date.now();

        // One join per translatable column; each falls back to the row's own text.
        const columns = Object.entries(TRANSLATABLE_COLUMNS);
        const joins = columns
            .map(
                ([, column]) =>
                    `LEFT JOIN translations t_${column}
                       ON t_${column}.table_name = ?1 AND t_${column}.row_id = b.id
                      AND t_${column}.column_name = '${column}' AND t_${column}.locale = ?2`,
            )
            .join("\n");
        const texts = columns
            .map(([property, column]) => `COALESCE(t_${column}.value, b.${column}) AS ${property}`)
            .join(", ");

        const { results } = await this.db
            .prepare(
                `SELECT ${META_COLUMNS}, ${texts}
                 FROM banners b
                 ${joins}
                 WHERE b.starts_at <= ?3 AND b.ends_at >= ?3
                 ORDER BY b.date_created DESC`,
            )
            .bind(BANNERS_TABLE, locale, now)
            .all<BannerRow>();

        return results.map(fromRow);
    }

    /**
     * Create or update a banner and replace its translations, atomically.
     * @param id The banner to update, or null to create it
     * @param banner The banner, with its texts in `banner.language`
     * @param translations The texts of every other language
     * @returns The banner id
     */
    public async save(
        id: number | null,
        banner: Omit<BannerRecord, "id" | "dateCreated">,
        translations: BannerTranslations,
    ): Promise<number> {
        const values = [
            banner.language,
            banner.title,
            banner.content,
            banner.ctaText,
            banner.ctaLink,
            banner.startsAt.getTime(),
            banner.endsAt.getTime(),
        ];

        const upsertBanner =
            id === null
                ? this.db
                      .prepare(
                          `INSERT INTO banners (
                            language, title, content, cta_text, cta_link, starts_at, ends_at,
                            date_created
                         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                         RETURNING id`,
                      )
                      .bind(...values, Date.now())
                : this.db
                      .prepare(
                          `UPDATE banners SET
                            language = ?, title = ?, content = ?, cta_text = ?, cta_link = ?,
                            starts_at = ?, ends_at = ?
                         WHERE id = ?
                         RETURNING id`,
                      )
                      .bind(...values, id);

        // A batch runs as one transaction, so a new banner is the newest row of the table.
        const bannerId = "COALESCE(?, (SELECT MAX(id) FROM banners))";

        // Languages dropped in the editor must not keep their old texts.
        const clearTexts = this.db
            .prepare(`DELETE FROM translations WHERE table_name = ? AND row_id = ${bannerId}`)
            .bind(BANNERS_TABLE, id);

        // Selected from banners so an id that does not exist inserts nothing.
        const insertText = this.db.prepare(
            `INSERT INTO translations (table_name, row_id, column_name, locale, value)
             SELECT ?, id, ?, ?, ? FROM banners WHERE id = ${bannerId}`,
        );

        const insertTexts = Object.entries(translations).flatMap(([locale, texts]) =>
            (Object.keys(TRANSLATABLE_COLUMNS) as (keyof BannerTexts)[])
                .filter((property) => texts[property])
                .map((property) =>
                    insertText.bind(
                        BANNERS_TABLE,
                        TRANSLATABLE_COLUMNS[property],
                        locale,
                        texts[property],
                        id,
                    ),
                ),
        );

        const [result] = await this.db.batch<{ id: number }>([
            upsertBanner,
            clearTexts,
            ...insertTexts,
        ]);
        const saved = result.results[0];

        if (!saved) {
            throw new Error(`Banner ${id} not found`);
        }

        return saved.id;
    }

    /**
     * Delete a banner and its translations, which have no FK to cascade from.
     * @param id The banner to delete
     */
    public async delete(id: number): Promise<void> {
        await this.db.batch([
            this.db.prepare(`DELETE FROM banners WHERE id = ?`).bind(id),
            this.db
                .prepare(`DELETE FROM translations WHERE table_name = ? AND row_id = ?`)
                .bind(BANNERS_TABLE, id),
        ]);
    }
}

export const bannerRepository = new BannerRepository(env.DB);
