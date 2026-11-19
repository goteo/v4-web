import { describe, expect, it } from "vitest";

import { getCampaignPhase, PROJECT_STATUSES } from "./projectStatus";

import type { ProjectStatus } from "./projectStatus";

describe("getCampaignPhase", () => {
    it("classifies every known status", () => {
        for (const status of PROJECT_STATUSES) {
            expect(["before", "during", "after"]).toContain(getCampaignPhase(status));
        }
    });

    it("only treats in_campaign as the campaign phase", () => {
        expect(PROJECT_STATUSES.filter((status) => getCampaignPhase(status) === "during")).toEqual([
            "in_campaign",
        ]);
    });

    it("classifies the statuses before the campaign", () => {
        const before: ProjectStatus[] = [
            "in_draft",
            "to_campaign_review",
            "in_campaign_review",
            "in_campaign_review.to_change",
            "in_campaign_review.to_review",
            "campaign_review.rejected",
            "to_campaign",
        ];

        expect(before.every((status) => getCampaignPhase(status) === "before")).toBe(true);
    });

    it("classifies the post-campaign statuses", () => {
        const after: ProjectStatus[] = [
            "campaign.failed",
            "campaign.cancelled",
            "to_funding_review",
            "in_funding_review",
            "in_funding_review.to_change",
            "in_funding_review.to_review",
            "funding_review.rejected",
            "to_funding",
            "in_funding",
            "funding.paid",
        ];

        expect(after.every((status) => getCampaignPhase(status) === "after")).toBe(true);
    });
});
