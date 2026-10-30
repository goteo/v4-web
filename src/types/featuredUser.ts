import type { MoneyOutput } from "../openapi/client/types.gen";

/**
 * A promoter highlighted on the home page, together with a summary of their projects.
 *
 * Shared by the home grid (`components/home/FeaturedUsers.svelte`) and each card
 * (`components/home/FeaturedUserCard.svelte`). The values are resolved from the
 * featured users table plus `summarizeOwnerProjects`.
 */
export interface FeaturedUser {
    /** Stable identifier of the featured entry, used as the list key. */
    id: number;

    /** Display name, falling back to the handle. */
    name: string;

    /** Avatar URL, or `null` when the user has no avatar. */
    image: string | null;

    /** Number of projects owned by the user, drafts included. */
    ownProjects: number;

    /** Funds raised by the user's projects. */
    capitalRaised: MoneyOutput;
}
