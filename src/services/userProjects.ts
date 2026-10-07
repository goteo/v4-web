import { apiAccountingsIdGet, apiProjectsGetCollection } from "../openapi/client";
import { client } from "../openapi/client/client.gen";
import { apiUsersIdOrHandleGetUrl } from "../openapi/client/operation-paths.gen";
import { getBaseUrl, getDefaultCurrency } from "../utils/consts";
import { extractId } from "../utils/extractId";
import { toCollectionItems } from "../utils/hydra";
import { sumMoney } from "../utils/money";

import type { MoneyOutput, Project } from "../openapi/client/types.gen";

/**
 * Page size used to pull the projects of a single owner. Mirrors the largest page already
 * used across the app; owners with more projects than this report a capped amount.
 */
const PROJECTS_PAGE_SIZE = 100;

/** The lifecycle statuses defined by the API. */
type ApiProjectStatus = NonNullable<Project["status"]>;

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
 * - `showMoney` in the same file marks `funding.paid` as `false`, because a funded project
 *   is archived and its money has already been disbursed, so the card stops showing an
 *   amount. That is a display rule. A project that reached funding *did* raise the money,
 *   so it must still be summed here.
 * - `PUBLIC_STATUSES_TO_STATUSES` in `utils/projectStatus.ts` groups the same statuses
 *   differently again, for the public search filter.
 *
 * Coupling a figure shown on the home page to a tab grouping would let a UI change alter
 * it silently. The three groupings answer three different questions, so each stays next
 * to the feature that asks it.
 */
const RAISED_STATUSES = new Set<ApiProjectStatus>([
    "in_campaign",
    "to_funding_review",
    "in_funding_review",
    "in_funding_review.to_change",
    "in_funding_review.to_review",
    "to_funding",
    "in_funding",
    "funding.paid",
]);

export interface OwnerProjectsSummary {
    /** Total projects reported by the collection, independent of the page size. */
    totalProjects: number;
    /** Sum of the funds raised by the loaded projects. */
    amount: number;
    currency: string;
}

/**
 * Summarises the projects owned by a user: how many they have and how much they raised.
 *
 * `Project.accounting` is the accounting holding the funds raised by that project, so the
 * raised amount is the sum of the balances of the projects in `RAISED_STATUSES`. Balances can
 * be in different currencies, so the sum goes through `sumMoney` to convert them.
 *
 * The count is every owned project, drafts included, while the amount only adds the projects
 * that reached a campaign. Projects are fetched without a status filter so `totalItems` still
 * reports the full count.
 *
 * Mirrors what the profile page does in `ProjectsCard.svelte`, which needs the individual
 * projects on top of this summary.
 *
 * @param userIdOrHandle Identifier or handle of the owning user
 * @param acceptLanguage Locale for the API responses
 * @returns The project count and the raised amount
 */
export async function summarizeOwnerProjects(
    userIdOrHandle: string,
    acceptLanguage: string,
): Promise<OwnerProjectsSummary> {
    const ownerIri = client.buildUrl({
        url: apiUsersIdOrHandleGetUrl,
        path: { idOrHandle: userIdOrHandle },
    });

    const { data: projectsResponse } = await apiProjectsGetCollection({
        baseUrl: getBaseUrl(),
        query: { owner: ownerIri, itemsPerPage: PROJECTS_PAGE_SIZE },
        // JSON-LD carries the real total count, independent of the page size.
        headers: { Accept: "application/ld+json", "Accept-Language": acceptLanguage },
    });

    const collection = projectsResponse as Record<string, unknown> | undefined;
    const projects = toCollectionItems<Project>(projectsResponse);

    const totalProjects =
        (collection?.totalItems as number | undefined) ??
        (collection?.["hydra:totalItems"] as number | undefined) ??
        projects.length;

    const raisedAccountingIds = Array.from(
        new Set(
            projects
                .filter((project) => RAISED_STATUSES.has(project.status as ApiProjectStatus))
                .map((project) => extractId(project.accounting))
                .filter((id): id is string => Boolean(id)),
        ),
    );

    if (raisedAccountingIds.length === 0) {
        return { totalProjects, amount: 0, currency: getDefaultCurrency() };
    }

    const balances = await Promise.all(
        raisedAccountingIds.map(async (id) => {
            const { data } = await apiAccountingsIdGet({
                baseUrl: getBaseUrl(),
                path: { id },
                headers: { "Accept-Language": acceptLanguage },
            });

            return data?.balance ?? null;
        }),
    );

    const valid = balances.filter(
        (balance): balance is MoneyOutput => typeof balance?.amount === "number",
    );

    const total = sumMoney(valid);

    return {
        totalProjects,
        amount: total.amount ?? 0,
        currency: total.currency ?? getDefaultCurrency(),
    };
}
