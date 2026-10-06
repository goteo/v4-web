import type { Project } from "../openapi/client/index.ts";

/**
 * Public project statuses for the public search page.
 *
 * A project has many internal `status` values across its lifecycle. Only three
 * grouped public statuses are exposed to public search. The UI multiselect works
 * with these public statuses; the API receives the expanded `status[]` list.
 */
export type ProjectPublicStatus = "in_campaign" | "funded" | "archived";

/**
 * Maps each public status (UI selection) to the real project `status` values it
 * covers. "funded" is the literal set of all post-campaign statuses that are not
 * archived.
 */
export const PUBLIC_STATUSES_TO_STATUSES: Record<ProjectPublicStatus, string[]> = {
    in_campaign: ["in_campaign"],
    funded: [
        "to_funding_review",
        "in_funding_review",
        "in_funding_review.request_change",
        "funding_review.rejected",
        "to_funding",
        "in_funding",
        "funding.paid",
    ],
    archived: ["campaign.failed"],
};

export const ALL_PUBLIC_STATUSES: ProjectPublicStatus[] = ["in_campaign", "funded", "archived"];

const PUBLIC_API_STATUSES = new Set(Object.values(PUBLIC_STATUSES_TO_STATUSES).flat());

/**
 * Expands public statuses into the `status[]` sent to the API. An empty
 * selection falls back to the union of all public statuses — public search must
 * never query a non-public status.
 */
export function expandPublicStatuses(publicStatuses: ProjectPublicStatus[]): string[] {
    const src = publicStatuses.length ? publicStatuses : ALL_PUBLIC_STATUSES;
    return src.flatMap((publicStatus) => PUBLIC_STATUSES_TO_STATUSES[publicStatus]);
}

/**
 * Reverse-maps API `status[]` values back to the public statuses they belong to
 * (for hydrating the UI from filters). Unknown values are discarded; an empty
 * result falls back to all public statuses.
 */
export function parsePublicStatuses(statuses: string[]): ProjectPublicStatus[] {
    const matched = ALL_PUBLIC_STATUSES.filter((publicStatus) =>
        PUBLIC_STATUSES_TO_STATUSES[publicStatus].some((status) => statuses.includes(status)),
    );
    return matched.length ? matched : ALL_PUBLIC_STATUSES;
}

/**
 * Constrains an arbitrary `status[]` (e.g. from the URL) to public statuses.
 * Non-public values are discarded; an empty result falls back to the union of
 * all public statuses so public search can never query a non-public status.
 */
export function constrainToPublicStatuses(statuses: string[] = []): string[] {
    const valid = statuses.filter((status) => PUBLIC_API_STATUSES.has(status));
    return valid.length ? valid : expandPublicStatuses(ALL_PUBLIC_STATUSES);
}

/** Campaign review statuses: listed in the admin review page and selectable in its dropdown. */
export const CAMPAIGN_REVIEW_STATUSES: NonNullable<Project["status"]>[] = [
    "to_campaign_review",
    "in_campaign_review",
    "in_campaign_review.to_review",
    "in_campaign_review.to_change",
    "campaign_review.rejected",
    "to_campaign",
];
