import { env } from "cloudflare:workers";

import { buildDefaultFooter } from "../layouts/footer-data";

import type { FooterConfig } from "../types/footer";

const FOOTER_KEY = "footer";

class FooterRepository {
    db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    /**
     * The footer content, or the built-in one while no admin has saved any.
     * @returns The footer to render
     */
    public async get(): Promise<FooterConfig> {
        // Every page renders the footer: a D1 failure (or a pending migration) must not
        // take the whole site down, so it degrades to the built-in footer.
        try {
            const row = await this.db
                .prepare(`SELECT value FROM site_settings WHERE key = ?`)
                .bind(FOOTER_KEY)
                .first<{ value: string }>();

            // Laid over the defaults, so a footer saved before a field existed still has it.
            return { ...buildDefaultFooter(), ...(row && (JSON.parse(row.value) as FooterConfig)) };
        } catch (error) {
            console.error("[footer] Could not read the stored footer, using the default", error);

            return buildDefaultFooter();
        }
    }

    /**
     * Replace the footer content.
     * @param config The validated footer
     */
    public async save(config: FooterConfig): Promise<void> {
        await this.db
            .prepare(
                `INSERT INTO site_settings (key, value, date_updated) VALUES (?, ?, ?)
                 ON CONFLICT (key) DO UPDATE SET
                    value = excluded.value,
                    date_updated = excluded.date_updated`,
            )
            .bind(FOOTER_KEY, JSON.stringify(config), Date.now())
            .run();
    }
}

export const footerRepository = new FooterRepository(env.DB);
