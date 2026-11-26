import { getDefaultCurrency } from "./consts";

import type { Money } from "../openapi/client";
import type { Project } from "../openapi/client/types.gen";
import type { Campaign } from "../types/campaign";

/**
 * Transform API Project to Campaign format for search results
 * Follows the same pattern as home page components
 */
export async function transformProjectToCampaign(project: Project): Promise<Campaign> {
    if (!project.accounting) {
        throw new Error(`Missing accounting for project ${project.slug}`);
    }

    // Get image URL - simple fallback to video thumbnail
    const image = project.cover || project.video?.thumbnail || "";

    // Get minimum budget
    const minimum: Money = project.budget?.minimum?.money || {
        amount: 0,
        currency: getDefaultCurrency(),
    };

    // Get optimum budget
    const optimum: Money | undefined = project.budget?.optimum?.money;

    const obtained: Money = project.accounting.balance || {
        amount: 0,
        currency: getDefaultCurrency(),
    };

    return {
        ...project,
        slug: project.slug!,
        title: project.title || "",
        image,
        obtained,
        minimum,
        optimum,
        size: "small",
    };
}

/**
 * Transform array of Projects to Campaigns
 */
export async function transformProjectsToCampaigns(projects: Project[]): Promise<Campaign[]> {
    return await Promise.all(projects.map((project) => transformProjectToCampaign(project)));
}
