import { summarizeOwnerProjects } from "./userProjects";
import { apiUsersIdOrHandleGet } from "../openapi/client/sdk.gen";
import { featuredUserRepository } from "../repositories/featuredUsers";
import { getBaseUrl } from "../utils/consts";

import type { FeaturedUser } from "../types/featuredUser";

/**
 * The users featured on the home page, enriched with the data the cards display.
 *
 * The stored records only hold user ids; the display name, the avatar and the project
 * figures are read from the API on every request so they never go stale. Resolving them
 * here keeps the page from having to know how the section is assembled.
 *
 * @param acceptLanguage Locale for the API responses
 * @returns The featured users, in the order they are displayed
 */
export async function getFeaturedUsers(acceptLanguage: string): Promise<FeaturedUser[]> {
    const records = await featuredUserRepository.getAll();

    return Promise.all(
        records.map(async (record) => {
            const { data: user } = await apiUsersIdOrHandleGet({
                baseUrl: getBaseUrl(),
                path: { idOrHandle: String(record.userId) },
                headers: { "Accept-Language": acceptLanguage },
            });

            const summary = await summarizeOwnerProjects(String(record.userId), acceptLanguage);

            return {
                id: record.id,
                name: user?.displayName ?? user?.handle ?? String(record.userId),
                image: user?.avatar ?? null,
                ownProjects: summary.totalProjects,
                capitalRaised: summary.amount,
                currency: summary.currency,
            };
        }),
    );
}
