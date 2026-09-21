import type { Project } from "../openapi/client";
import type { Money } from "../openapi/client";

/**
 * CampaignSize type for display sizing of campaign cards.
 * Used to control responsive layout behavior.
 */
export type CampaignSize = "small" | "large";

/**
 * Campaign display data built from Project API type.
 *
 * NOTE on routing:
 * - Use Project.slug for URL routing (e.g., `/project/{campaign.slug}`), NOT id
 * - The id field from API is a numeric ID, slug is the URL-friendly identifier
 *
 * Display properties:
 * - `obtained` and `minimum`: Funding amounts from project.funding
 * - `image`: Path from project.image
 * - `userDonations`: Aggregated from user's contributions
 * - `daysRemaining`: Calculated from campaign end date
 * - `hasMatchfunding`: Indicates if project participates in matchfunding
 * - `tags`: Custom display tags for the project
 * - `category`: Project category for filtering and display
 */
export interface Campaign extends Project {
    /** Project's slug for URL routing */
    slug: string;
    /** Campaign title */
    title: string;
    /** Campaign image URL path */
    image: string;
    /** Current funding amount — optional when fetched client-side per card */
    obtained?: Money;
    /** Minimum funding goal */
    minimum?: Money;
    /** Optional optimum funding goal */
    optimum?: Money;
    /** Optional sizing for component layout */
    size?: CampaignSize;
    /** User's total donations to this project */
    userDonations?: Money;
    /** Project category: solidary, ecology, democracy, culture, etc. */
    category?: string;
    /** Days remaining until campaign ends */
    daysRemaining?: number;
    /** Whether this project participates in matchfunding */
    hasMatchfunding?: boolean;
    /** Custom display tags */
    tags?: string[];
}
