import type { Project } from "../openapi/client/types.gen.ts";

export type ProjectStatus = NonNullable<Project["status"]>;

/**
 * Owned projects section tabs — each maps to the project statuses shown in it.
 */
export const tabStatusGroups: Record<string, ProjectStatus[]> = {
    active: ["in_campaign"],
    review: [
        "in_campaign_review",
        "in_campaign_review.to_change",
        "in_campaign_review.to_review",
        "to_campaign",
    ],
    funding: [
        "to_funding_review",
        "in_funding_review",
        "in_funding_review.to_change",
        "in_funding_review.to_review",
        "to_funding",
        "in_funding",
    ],
    archived: [
        "campaign_review.rejected",
        "funding_review.rejected",
        "campaign.failed",
        "campaign.cancelled",
        "funding.paid",
    ],
    draft: ["in_draft", "to_campaign_review"],
};

export interface OwnedCardAction {
    key: string;
    kind: "primary" | "secondary" | "ghost";
}

type StatusCards = Record<
    ProjectStatus,
    { tagKey?: string; showMoney: boolean; actions: OwnedCardAction[] }
>;

/**
 * Per-status card configuration for the "Tus Proyectos" section. Tag and action
 * labels are i18n key paths under `pages.me.ownedProjects`; the component
 * resolves them via `$t`. Keys are ordered following the tab/status flow.
 */
export const statusCards: StatusCards = {
    // Active
    in_campaign: { showMoney: true, actions: [{ key: "actions.manage", kind: "ghost" }] },

    // Review
    in_campaign_review: {
        tagKey: "tags.reviewing",
        showMoney: false,
        actions: [{ key: "actions.advisory", kind: "secondary" }],
    },
    "in_campaign_review.to_change": {
        tagKey: "tags.needsChanges",
        showMoney: false,
        actions: [
            { key: "actions.edit", kind: "ghost" },
            { key: "actions.advisory", kind: "secondary" },
        ],
    },
    "in_campaign_review.to_review": {
        tagKey: "tags.pendingReview",
        showMoney: false,
        actions: [
            { key: "actions.edit", kind: "ghost" },
            { key: "actions.advisory", kind: "secondary" },
        ],
    },
    to_campaign: {
        tagKey: "tags.readyToPublish",
        showMoney: false,
        actions: [{ key: "actions.publish", kind: "primary" }],
    },

    // Funding
    to_funding_review: {
        tagKey: "tags.pendingReview",
        showMoney: true,
        actions: [
            { key: "actions.view", kind: "primary" },
            { key: "actions.advisory", kind: "secondary" },
        ],
    },
    in_funding_review: {
        tagKey: "tags.reviewing",
        showMoney: true,
        actions: [{ key: "actions.advisory", kind: "secondary" }],
    },
    "in_funding_review.to_change": {
        tagKey: "tags.needsChanges",
        showMoney: true,
        actions: [
            { key: "actions.view", kind: "primary" },
            { key: "actions.advisory", kind: "secondary" },
        ],
    },
    "in_funding_review.to_review": {
        tagKey: "tags.pendingReview",
        showMoney: true,
        actions: [
            { key: "actions.view", kind: "primary" },
            { key: "actions.advisory", kind: "secondary" },
        ],
    },
    to_funding: {
        tagKey: "tags.readyToPublish",
        showMoney: true,
        actions: [{ key: "actions.view", kind: "primary" }],
    },
    in_funding: { showMoney: true, actions: [{ key: "actions.manage", kind: "ghost" }] },

    // Archived
    "campaign_review.rejected": {
        tagKey: "tags.rejected",
        showMoney: false,
        actions: [{ key: "actions.viewReview", kind: "primary" }],
    },
    "funding_review.rejected": {
        tagKey: "tags.rejected",
        showMoney: false,
        actions: [{ key: "actions.viewReview", kind: "primary" }],
    },
    "campaign.failed": {
        tagKey: "tags.campaignFailed",
        showMoney: false,
        actions: [{ key: "actions.view", kind: "primary" }],
    },
    "campaign.cancelled": {
        tagKey: "tags.campaignCancelled",
        showMoney: false,
        actions: [{ key: "actions.view", kind: "primary" }],
    },
    "funding.paid": {
        tagKey: "tags.fundingPaid",
        showMoney: false,
        actions: [{ key: "actions.view", kind: "primary" }],
    },

    // Draft
    in_draft: {
        tagKey: "tags.draft",
        showMoney: false,
        actions: [
            { key: "actions.edit", kind: "ghost" },
            { key: "actions.sendToReview", kind: "primary" },
        ],
    },
    to_campaign_review: {
        tagKey: "tags.pendingReview",
        showMoney: false,
        actions: [{ key: "actions.edit", kind: "ghost" }],
    },
};

export function statusCardConfig(status: ProjectStatus | undefined) {
    if (!status) return undefined;
    return statusCards[status];
}
