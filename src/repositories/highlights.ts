import { env } from "cloudflare:workers";

export interface HighlightRecord {
    id: number;
    type: string;
    layout: string;
    dateCreated: Date;
    dateUpdated: Date;
}

export interface HighlightSlotRecord {
    id: number;
    highlightId: number;
    position: number;
    projectId: number;
}

export interface HighlightWithSlots {
    highlight: HighlightRecord;
    slots: HighlightSlotRecord[];
}

class HighlightRepository {
    db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    private async fetchHighlightWithSlots(id: number): Promise<HighlightWithSlots | null> {
        const highlight = await this.db
            .prepare(
                `SELECT
                    id,
                    type,
                    layout,
                    date_created AS dateCreated,
                    date_updated AS dateUpdated
                 FROM highlights
                 WHERE id = ?`,
            )
            .bind(id)
            .first<HighlightRecord>()
            .then((r) =>
                r
                    ? {
                          ...r,
                          dateCreated: new Date(r.dateCreated),
                          dateUpdated: new Date(r.dateUpdated),
                      }
                    : null,
            );

        if (!highlight) return null;

        const slots = await this.loadSlots(highlight.id);

        return { highlight, slots };
    }

    private async loadSlots(highlightId: number): Promise<HighlightSlotRecord[]> {
        return await this.db
            .prepare(
                `SELECT
                    id,
                    highlight_id AS highlightId,
                    position,
                    CAST(project_id AS INTEGER) AS projectId
                 FROM highlight_slots
                 WHERE highlight_id = ?
                 ORDER BY position ASC`,
            )
            .bind(highlightId)
            .all<HighlightSlotRecord>()
            .then((data) => data.results);
    }

    /**
     * Returns the given highlight (by id) or, when no id is provided, the most
     * recent one. Returns null when there are no highlights at all.
     */
    public async get(id?: number): Promise<HighlightWithSlots | null> {
        let highlightId = id;

        if (highlightId === undefined) {
            highlightId = await this.db
                .prepare(`SELECT id FROM highlights ORDER BY id DESC LIMIT 1`)
                .first<{ id: number }>()
                .then((r) => r?.id);
        }

        if (highlightId === undefined) {
            return null;
        }

        return this.fetchHighlightWithSlots(highlightId);
    }

    /**
     * Creates a new highlight snapshot (with its slots) and returns it, keeping
     * a historical record of every save for retrospective analysis and rollbacks.
     */
    public async save(
        type: string,
        layout: string,
        projectIds: number[],
    ): Promise<HighlightWithSlots> {
        const now = Date.now();

        const result = await this.db
            .prepare(
                `INSERT INTO highlights (type, layout, date_created, date_updated)
                 VALUES (?, ?, ?, ?)`,
            )
            .bind(type, layout, now, now)
            .run();

        const highlightId = result.meta.last_row_id;

        if (projectIds.length > 0) {
            const stmt = this.db.prepare(
                `INSERT INTO highlight_slots (highlight_id, position, project_id)
                 VALUES (?, ?, ?)`,
            );

            const batch = projectIds.map((projectId, index) =>
                stmt.bind(highlightId, index, projectId),
            );
            await this.db.batch(batch);
        }

        return (await this.fetchHighlightWithSlots(highlightId))!;
    }

    /**
     * Deletes the given highlight (by id) or, when no id is provided, the most
     * recent one. Its slots are removed via the ON DELETE CASCADE.
     */
    public async delete(id?: number): Promise<void> {
        let highlightId = id;

        if (highlightId === undefined) {
            highlightId = await this.db
                .prepare(`SELECT id FROM highlights ORDER BY id DESC LIMIT 1`)
                .first<{ id: number }>()
                .then((r) => r?.id);
        }

        if (highlightId !== undefined) {
            await this.db.prepare(`DELETE FROM highlights WHERE id = ?`).bind(highlightId).run();
        }
    }

    /**
     * Lists every highlight snapshot with its slots, newest first, for
     * retrospective analysis.
     */
    public async getHistory(): Promise<HighlightWithSlots[]> {
        const highlights = await this.db
            .prepare(
                `SELECT
                    id,
                    type,
                    layout,
                    date_created AS dateCreated,
                    date_updated AS dateUpdated
                 FROM highlights
                 ORDER BY id DESC`,
            )
            .all<HighlightRecord>()
            .then((data) =>
                data.results.map((r) => ({
                    ...r,
                    dateCreated: new Date(r.dateCreated),
                    dateUpdated: new Date(r.dateUpdated),
                })),
            );

        return Promise.all(
            highlights.map(async (highlight) => ({
                highlight,
                slots: await this.loadSlots(highlight.id),
            })),
        );
    }
}

export const highlightRepository = new HighlightRepository(env.DB);
