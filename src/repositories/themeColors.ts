import { env } from "cloudflare:workers";

import type { DarkThemeColors, ThemeColors } from "../utils/themeColors";

export interface ThemeColorsRecord {
    id: number;
    lightColors: Partial<ThemeColors>;
    darkColors: Partial<DarkThemeColors>;
    dateUpdated: Date;
}

interface ThemeColorsRow {
    id: number;
    lightColors: string;
    darkColors: string;
    dateUpdated: number;
}

class ThemeColorsRepository {
    db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    public async get(): Promise<ThemeColorsRecord | null> {
        const row = await this.db
            .prepare(
                `SELECT
                    id,
                    light_colors AS lightColors,
                    dark_colors AS darkColors,
                    date_updated AS dateUpdated
                 FROM theme_colors
                 WHERE id = 1`,
            )
            .first<ThemeColorsRow>();

        if (!row) return null;

        return {
            id: row.id,
            lightColors: JSON.parse(row.lightColors) as Partial<ThemeColors>,
            darkColors: JSON.parse(row.darkColors) as Partial<DarkThemeColors>,
            dateUpdated: new Date(row.dateUpdated),
        };
    }

    public async save(
        lightColors: Partial<ThemeColors>,
        darkColors: Partial<DarkThemeColors>,
    ): Promise<ThemeColorsRecord> {
        await this.db
            .prepare(
                `INSERT INTO theme_colors (id, light_colors, dark_colors, date_updated)
                 VALUES (1, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                    light_colors = excluded.light_colors,
                    dark_colors = excluded.dark_colors,
                    date_updated = excluded.date_updated`,
            )
            .bind(JSON.stringify(lightColors), JSON.stringify(darkColors), Date.now())
            .run();

        return (await this.get())!;
    }

    public async reset(): Promise<void> {
        await this.db.prepare(`DELETE FROM theme_colors WHERE id = 1`).run();
    }
}

export const themeColorsRepository = new ThemeColorsRepository(env.DB);
