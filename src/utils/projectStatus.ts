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

/**
 * Statuses whose accounting holds money the project actually raised.
 *
 * Everything before this set either was never public (`in_draft`, `to_campaign_review`,
 * `in_campaign_review*`, `campaign_review.rejected`) so no funds were ever collected, or
 * ended in `campaign.failed` / `campaign.cancelled`, whose money is handed back to the
 * contributors and therefore must not count as raised.
 *
 * This set is deliberately written out rather than derived from the groupings in
 * `utils/ownedProjectCards.ts`. It happens to be exactly `tabStatusGroups.active` plus
 * `tabStatusGroups.funding` plus `funding.paid`, but those describe which tab a project
 * lands in for the admin "Tus Proyectos" section, not what counts as raised:
 *
 * - `showMoney` in that file marks `funding.paid` as `false`, because a funded project is
 *   archived and its money has already been disbursed, so the card stops showing an amount.
 *   That is a display rule. A project that reached funding *did* raise the money, so it
 *   must still be summed here.
 * - `PUBLIC_STATUSES_TO_STATUSES` above groups the same statuses differently again, for the
 *   public search filter.
 *
 * Coupling a figure shown on the home page to a UI grouping would let a UI change alter it
 * silently, so the three groupings stay apart even though they now share this file.
 */
export const RAISED_STATUSES = new Set<string>([
    "in_campaign",
    "to_funding_review",
    "in_funding_review",
    "in_funding_review.to_change",
    "in_funding_review.to_review",
    "to_funding",
    "in_funding",
    "funding.paid",
]);
