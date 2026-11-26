import { env } from "cloudflare:workers";

import { labels, type Locale } from "../i18n/locales";

import type { LocalizedText } from "../types/footer";

/** Rows of the shared `translations` table that belong to FAQs use this table name. */
const FAQS_TABLE = "faqs";

/** The translatable texts of a FAQ. Property names match the DB columns. */
const TEXT_COLUMNS = ["question", "answer"] as const;

const LOCALES = Object.keys(labels) as Locale[];

/** A FAQ as the editor sends it: without an id while it has not been saved. */
export interface FaqInput {
    id?: number;
    question: LocalizedText;
    answer: LocalizedText;
}

export interface Faq extends FaqInput {
    id: number;
    /** When its texts last changed; reordering does not count. */
    dateUpdated: Date;
}

interface FaqRow {
    id: number;
    language: Locale;
    question: string;
    answer: string;
    dateUpdated: number;
}

interface TranslationRow {
    rowId: number;
    locale: Locale;
    column: (typeof TEXT_COLUMNS)[number];
    value: string;
}

/**
 * Whether two FAQs have the same texts in every locale.
 * @param a A FAQ
 * @param b Another FAQ
 */
function sameTexts(a: FaqInput, b: FaqInput): boolean {
    return TEXT_COLUMNS.every((column) =>
        LOCALES.every((locale) => (a[column][locale] ?? "") === (b[column][locale] ?? "")),
    );
}

class FaqRepository {
    db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    /**
     * Every FAQ with its texts in every locale, in display order.
     * @returns All stored FAQs
     */
    public async getAll(): Promise<Faq[]> {
        const [faqs, translations] = await this.db.batch([
            this.db.prepare(
                `SELECT id, language, question, answer, date_updated AS dateUpdated
                 FROM faqs ORDER BY position, id`,
            ),
            this.db
                .prepare(
                    `SELECT row_id AS rowId, locale, column_name AS "column", value
                     FROM translations WHERE table_name = ?`,
                )
                .bind(FAQS_TABLE),
        ]);

        const byId = new Map<number, Faq>(
            (faqs.results as FaqRow[]).map((row) => [
                row.id,
                {
                    id: row.id,
                    question: { [row.language]: row.question },
                    answer: { [row.language]: row.answer },
                    dateUpdated: new Date(row.dateUpdated),
                },
            ]),
        );

        for (const { rowId, locale, column, value } of translations.results as TranslationRow[]) {
            const faq = byId.get(rowId);

            if (faq) {
                faq[column][locale] = value;
            }
        }

        return [...byId.values()];
    }

    /**
     * Replace the whole list: FAQs missing from it are deleted, the ones without a stored id
     * are created, and the rest keep their `dateUpdated` unless their texts changed.
     * @param faqs Every FAQ, in display order
     * @param language The locale whose texts go in the row; the others go to `translations`
     */
    public async saveAll(faqs: FaqInput[], language: Locale): Promise<void> {
        // ponytail: read-then-write outside the batch; two admins saving at once is last-write-wins.
        const stored = new Map((await this.getAll()).map((faq) => [faq.id, faq]));
        const kept = new Set(faqs.map((faq) => faq.id).filter((id) => id && stored.has(id)));
        const now = Date.now();

        const statements: D1PreparedStatement[] = [...stored.keys()]
            .filter((id) => !kept.has(id))
            .flatMap((id) => [
                this.db.prepare(`DELETE FROM faqs WHERE id = ?`).bind(id),
                this.db
                    .prepare(`DELETE FROM translations WHERE table_name = ? AND row_id = ?`)
                    .bind(FAQS_TABLE, id),
            ]);

        // A batch runs as one transaction, so a new FAQ is the newest row of the table.
        const rowId = "COALESCE(?, (SELECT MAX(id) FROM faqs))";

        const insertText = this.db.prepare(
            `INSERT INTO translations (table_name, row_id, column_name, locale, value)
             VALUES (?, ${rowId}, ?, ?, ?)`,
        );

        faqs.forEach((faq, position) => {
            const old = faq.id ? stored.get(faq.id) : undefined;

            if (old && sameTexts(old, faq)) {
                statements.push(
                    this.db
                        .prepare(`UPDATE faqs SET position = ? WHERE id = ?`)
                        .bind(position, old.id),
                );

                return;
            }

            const values = [position, language, faq.question[language], faq.answer[language], now];

            if (old) {
                statements.push(
                    this.db
                        .prepare(
                            `UPDATE faqs SET position = ?, language = ?, question = ?, answer = ?,
                                date_updated = ?
                             WHERE id = ?`,
                        )
                        .bind(...values, old.id),
                    // Locales emptied in the editor must not keep their old texts.
                    this.db
                        .prepare(`DELETE FROM translations WHERE table_name = ? AND row_id = ?`)
                        .bind(FAQS_TABLE, old.id),
                );
            } else {
                statements.push(
                    this.db
                        .prepare(
                            `INSERT INTO faqs (position, language, question, answer, date_updated)
                             VALUES (?, ?, ?, ?, ?)`,
                        )
                        .bind(...values),
                );
            }

            for (const locale of LOCALES.filter((locale) => locale !== language)) {
                for (const column of TEXT_COLUMNS) {
                    const value = faq[column][locale];

                    if (value) {
                        statements.push(
                            insertText.bind(FAQS_TABLE, old?.id ?? null, column, locale, value),
                        );
                    }
                }
            }
        });

        if (statements.length > 0) {
            await this.db.batch(statements);
        }
    }
}

export const faqRepository = new FaqRepository(env.DB);
