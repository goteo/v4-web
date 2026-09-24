import { env } from "cloudflare:workers";

import {
    HOME_HERO_COLUMN_TO_PROPERTY,
    HOME_HERO_TABLE,
    HOME_HERO_TRANSLATABLE_COLUMNS,
    translationRepository,
} from "./translations";

export interface HomeHeroRecord {
    id: number;
    /**
     * The locale the base row is written in. Translation rows in the
     * `translations` table cover the remaining locales.
     */
    language: string;
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
    /**
     * Locale codes the hero content is available in: the base (default) locale
     * plus every locale with a stored translation row. Populated by `getAll()`.
     */
    languages?: string[];
}

const COLUMNS = `id,
                 language,
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
     * Every hero ever scheduled, most recently authored first. Each row carries
     * the `languages` it is available in: the base `language` plus every locale
     * with a stored translation.
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

        const heroes = results.map(fromRow);

        const { results: translationRows } = await this.db
            .prepare(
                `SELECT row_id AS rowId, locale
                 FROM translations
                 WHERE table_name = ?`,
            )
            .bind(HOME_HERO_TABLE)
            .all<{ rowId: number; locale: string }>();

        const localesByRow: Record<number, string[]> = {};

        for (const translation of translationRows) {
            (localesByRow[translation.rowId] ??= []).push(translation.locale);
        }

        const defaultLocale = import.meta.env.PUBLIC_DEFAULT_LANGUAGE;

        for (const hero of heroes) {
            const baseLocale = hero.language || defaultLocale;
            // One `translations` row exists per translated column, so the
            // locales must be deduplicated: a locale is added once, not once
            // per translated field.
            const translationLocales = [...new Set(localesByRow[hero.id] ?? [])];

            hero.languages = [
                baseLocale,
                ...translationLocales.filter((locale) => locale !== baseLocale),
            ];
        }

        return heroes;
    }

    /**
     * The hero whose start date has already passed, most recently authored first.
     * @param locale When given and different from the default locale, the returned
     * hero has its stored translations for that locale merged on top of the base row.
     * @returns The active hero, or null when nothing is scheduled yet
     */
    public async getActive(locale?: string): Promise<HomeHeroRecord | null> {
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

        if (!row) {
            return null;
        }

        const hero = fromRow(row);

        const baseLocale = hero.language || import.meta.env.PUBLIC_DEFAULT_LANGUAGE;

        if (!locale || locale === baseLocale) {
            return hero;
        }

        const overrides = await translationRepository.get(
            HOME_HERO_TABLE,
            hero.id,
            locale,
            HOME_HERO_TRANSLATABLE_COLUMNS,
        );

        for (const [column, value] of Object.entries(overrides)) {
            if (!value) continue;

            const property =
                HOME_HERO_COLUMN_TO_PROPERTY[
                    column as (typeof HOME_HERO_TRANSLATABLE_COLUMNS)[number]
                ];

            hero[property as keyof HomeHeroRecord] = value as never;
        }

        return hero;
    }

    /**
     * Store a new hero block.
     * @param hero The hero to store
     * @returns The id of the newly created hero
     */
    public async create(hero: Omit<HomeHeroRecord, "id">): Promise<number> {
        const result = await this.db
            .prepare(
                `INSERT INTO home_hero (
                    language,
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
                hero.language,
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

        return Number(result.meta.last_row_id);
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
