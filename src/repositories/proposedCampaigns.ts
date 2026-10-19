import { env } from "cloudflare:workers";

export const PROPOSED_CAMPAIGN_TABS = ["ending-soon", "most-successful"] as const;

export type ProposedCampaignTab = (typeof PROPOSED_CAMPAIGN_TABS)[number];

export interface ProposedCampaignRecord {
    id: number;
    dateCreated: Date;
    dateUpdated: Date;
}

export interface ProposedCampaignSlotRecord {
    id: number;
    proposalId: number;
    tab: ProposedCampaignTab;
    position: number;
    projectId: number;
}

export interface ProposedCampaignWithSlots {
    proposal: ProposedCampaignRecord;
    slots: ProposedCampaignSlotRecord[];
}

/** Slot enriched with display data resolved from the platform API (not stored in D1). */
export interface ProposedCampaignSlotView {
    tab: ProposedCampaignTab;
    position: number;
    projectId: number;
    projectTitle: string;
    projectImage: string | null;
}

export type ProposedCampaignSlotsByTab = Record<ProposedCampaignTab, number[]>;

class ProposedCampaignsRepository {
    db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    private async loadSlots(proposalId: number): Promise<ProposedCampaignSlotRecord[]> {
        return await this.db
            .prepare(
                `SELECT
                    id,
                    proposal_id AS proposalId,
                    tab,
                    position,
                    CAST(project_id AS INTEGER) AS projectId
                 FROM proposed_campaign_slots
                 WHERE proposal_id = ?
                 ORDER BY tab ASC, position ASC`,
            )
            .bind(proposalId)
            .all<ProposedCampaignSlotRecord>()
            .then((data) => data.results);
    }

    /**
     * Returns the (single) proposed-campaigns record with its slots, or null when
     * nothing has been saved yet.
     */
    public async get(): Promise<ProposedCampaignWithSlots | null> {
        const proposal = await this.db
            .prepare(
                `SELECT
                    id,
                    date_created AS dateCreated,
                    date_updated AS dateUpdated
                 FROM proposed_campaigns
                 ORDER BY id DESC
                 LIMIT 1`,
            )
            .first<ProposedCampaignRecord>()
            .then((r) =>
                r
                    ? {
                          ...r,
                          dateCreated: new Date(r.dateCreated),
                          dateUpdated: new Date(r.dateUpdated),
                      }
                    : null,
            );

        if (!proposal) return null;

        const slots = await this.loadSlots(proposal.id);

        return { proposal, slots };
    }

    /**
     * Upserts the single editable record: reuses the existing row when there is
     * one, creates it otherwise, and replaces all of its slots in one batch.
     */
    public async save(slotsByTab: ProposedCampaignSlotsByTab): Promise<ProposedCampaignWithSlots> {
        const now = Date.now();

        const existingId = await this.db
            .prepare(`SELECT id FROM proposed_campaigns ORDER BY id DESC LIMIT 1`)
            .first<{ id: number }>()
            .then((r) => r?.id);

        let proposalId: number;

        if (existingId !== undefined) {
            proposalId = existingId;
            await this.db
                .prepare(`UPDATE proposed_campaigns SET date_updated = ? WHERE id = ?`)
                .bind(now, proposalId)
                .run();
        } else {
            const result = await this.db
                .prepare(
                    `INSERT INTO proposed_campaigns (date_created, date_updated)
                     VALUES (?, ?)`,
                )
                .bind(now, now)
                .run();
            proposalId = result.meta.last_row_id;
        }

        const batch: D1PreparedStatement[] = [
            this.db
                .prepare(`DELETE FROM proposed_campaign_slots WHERE proposal_id = ?`)
                .bind(proposalId),
        ];

        const insert = this.db.prepare(
            `INSERT INTO proposed_campaign_slots (proposal_id, tab, position, project_id)
             VALUES (?, ?, ?, ?)`,
        );

        for (const tab of PROPOSED_CAMPAIGN_TABS) {
            slotsByTab[tab].forEach((projectId, index) => {
                batch.push(insert.bind(proposalId, tab, index, projectId));
            });
        }

        await this.db.batch(batch);

        return (await this.fetchWithSlots(proposalId))!;
    }

    private async fetchWithSlots(proposalId: number): Promise<ProposedCampaignWithSlots | null> {
        const proposal = await this.db
            .prepare(
                `SELECT
                    id,
                    date_created AS dateCreated,
                    date_updated AS dateUpdated
                 FROM proposed_campaigns
                 WHERE id = ?`,
            )
            .bind(proposalId)
            .first<ProposedCampaignRecord>()
            .then((r) =>
                r
                    ? {
                          ...r,
                          dateCreated: new Date(r.dateCreated),
                          dateUpdated: new Date(r.dateUpdated),
                      }
                    : null,
            );

        if (!proposal) return null;

        const slots = await this.loadSlots(proposal.id);

        return { proposal, slots };
    }
}

export const proposedCampaignsRepository = new ProposedCampaignsRepository(env.DB);
