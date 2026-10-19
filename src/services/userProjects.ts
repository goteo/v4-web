import { apiAccountingsIdGet, apiProjectsGetCollection } from "../openapi/client";
import { client } from "../openapi/client/client.gen";
import { apiUsersIdOrHandleGetUrl } from "../openapi/client/operation-paths.gen";
import { getBaseUrl, getDefaultCurrency } from "../utils/consts";
import { extractId } from "../utils/extractId";
import { toCollectionItems } from "../utils/hydra";
import { sumMoney } from "../utils/money";
import { RAISED_STATUSES } from "../utils/projectStatus";

import type { MoneyOutput, Project } from "../openapi/client/types.gen";

/**
 * Page size used to pull the projects of a single owner. Mirrors the largest page already
 * used across the app; owners with more projects than this report a capped amount.
 */
const PROJECTS_PAGE_SIZE = 100;

export interface OwnerProjectsSummary {
    /** Total projects reported by the collection, independent of the page size. */
    totalProjects: number;
    /** Funds raised by the loaded projects, as returned by the API. */
    capitalRaised: MoneyOutput;
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
                .filter(
                    (project) =>
                        project.status !== undefined && RAISED_STATUSES.has(project.status),
                )
                .map((project) => extractId(project.accounting))
                .filter((id): id is string => Boolean(id)),
        ),
    );

    if (raisedAccountingIds.length === 0) {
        return { totalProjects, capitalRaised: { amount: 0, currency: getDefaultCurrency() } };
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
        capitalRaised: {
            amount: total.amount ?? 0,
            currency: total.currency ?? getDefaultCurrency(),
        },
    };
}
