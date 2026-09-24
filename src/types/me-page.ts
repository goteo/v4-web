import type { Money } from "../openapi/client/types.gen";

/**
 * Activity Data for /me Page (Phase 2)
 *
 * Extends Phase 1 types with filled state data including:
 * - Project grids for promoted and donated projects
 * - Enhanced project card data with status badges
 */

/**
 * Activity Data
 *
 * Contains all user activity data for a specific period.
 * Used by the /me page to render both summary cards and project grids.
 */
export interface ActivityData {
    /**
     * User's donation statistics and recent donations
     */
    donations?: DonationsSummary;
    /**
     * User's promoted projects statistics and recent projects
     */
    projects?: ProjectsSummary;
    /**
     * User's matchfunding calls statistics (if user manages matchfunding calls)
     */
    matchfunding?: MatchfundingActivity;
}

/**
 * Donations Summary (Phase 2 - Filled State)
 *
 * Enhanced donation summary with stats and recent items list.
 */
export interface DonationsSummary {
    /**
     * Total number of donations made in the period
     */
    count: number;
    /**
     * Total amount donated in the period (minor units)
     */
    total: Money;
    /**
     * Most recent donations for quick view (typically limited to 2-3 items)
     */
    recentDonations: DonationItem[];
}

/**
 * Donation Item
 *
 * Represents a single donation in the recent donations list.
 */
export interface DonationItem {
    /**
     * Unique donation identifier
     */
    id: string;
    /**
     * Amount donated (minor units - cents, pennies, etc.)
     */
    amount: Money;
    /**
     * Title of the project that received the donation
     */
    projectTitle: string;
    /**
     * Project slug for URL construction
     */
    projectSlug: string;
    /**
     * Date of the donation (ISO 8601 format)
     */
    date: string;
}

/**
 * Projects Summary (Phase 2 - Filled State)
 *
 * Enhanced projects summary with stats including total amount raised.
 */
export interface ProjectsSummary {
    /**
     * Total number of finished projects (funded or unfunded)
     */
    count: number;
    /**
     * Total amount raised across all user's projects (minor units)
     */
    totalRaised: Money;
    /**
     * Featured/most recent project with full details for card display
     */
    featuredProject?: ProjectCardData;
    /**
     * Most recent projects for quick view (typically limited to 2-3 items)
     */
    recentProjects: ProjectItem[];
}

/**
 * Project Item
 *
 * Represents a single project in the recent projects list.
 */
export interface ProjectItem {
    /**
     * Unique project identifier
     */
    id: string;
    /**
     * Project title
     */
    title: string;
    /**
     * Project slug for URL construction
     */
    slug: string;
    /**
     * Current project status
     */
    status: ProjectStatus;
    /**
     * ISO 8601 date string when project was created/promoted
     */
    createdAt: string;
}

/**
 * Project Card Data (Phase 2)
 *
 * Complete project data for rendering project cards in grids/sliders.
 * Used in "Tus proyectos activos impulsados" and "Proyectos activos donde donaste" sections.
 */
export interface ProjectCardData {
    /**
     * Unique project identifier
     */
    id: string;
    /**
     * Project title
     */
    title: string;
    /**
     * Project subtitle/tagline
     */
    subtitle: string;
    /**
     * Project slug for URL construction
     */
    slug: string;
    /**
     * Project cover image URL (optional)
     */
    imageUrl?: string;
    /**
     * Current project status (determines card behavior)
     */
    status: ProjectStatus;
    /**
     * Status badge to display (based on funding progress)
     */
    badgeVariant: StatusBadge;
    /**
     * Primary project category
     */
    category?: string;
    /**
     * Location/territory tag
     */
    location?: string;
    /**
     * Days remaining in campaign (null if campaign ended)
     */
    daysLeft?: number | null;
    /**
     * Funding statistics for progress display
     */
    funding: FundingStats;
    /**
     * User's total donations to this project (only for donated projects section).
     * Amount is in minor units (cents, pennies, etc.) per Money spec.
     */
    userDonations?: Money;
    /**
     * Whether this is a promoted project by the user (vs. donated project)
     */
    isPromoted?: boolean;
}

/**
 * Project Status
 *
 * Represents the current lifecycle state of a project.
 * Matches backend API project status values.
 */
export type ProjectStatus =
    | "draft" // Project is being created
    | "review" // Under review by Goteo team
    | "campaigning" // Active campaign accepting donations
    | "successful" // Campaign ended, minimum goal reached
    | "unsuccessful" // Campaign ended, minimum goal not reached
    | "completed" // Project finished and delivered
    | "cancelled"; // Project cancelled

/**
 * Status Badge
 *
 * Display badge shown on project cards based on funding progress.
 * Mapped to Spanish translations:
 * - "optimumReached": "Óptimo conseguido!" (green badge)
 * - "minimumReached": "Mínimo conseguido!" (blue badge)
 * - "goForMinimum": "¡A por el mínimo!" (yellow badge)
 * - "ended": "Finalizada" (red badge)
 */
export type StatusBadge = "optimumReached" | "minimumReached" | "goForMinimum" | "ended";

/**
 * Funding Statistics
 *
 * Monetary data for displaying project funding progress.
 * All amounts are in minor units (cents, pennies, etc.).
 */
export interface FundingStats {
    /**
     * Amount obtained/raised so far (minor units)
     */
    obtained: Money;
    /**
     * Minimum funding goal (minor units)
     */
    minimum: Money;
    /**
     * Optimum funding goal (stretch goal, minor units)
     */
    optimum: Money;
    /**
     * Percentage of minimum goal reached (0-100+)
     * Calculated as: (obtained / minimum) * 100
     */
    percentageMinimum: number;
    /**
     * Percentage of optimum goal reached (0-100+)
     * Calculated as: (obtained / optimum) * 100
     */
    percentageOptimum: number;
    /**
     * Amount still needed to reach minimum goal.
     * Null if minimum already reached.
     */
    needForMinimum?: Money | null;
    /**
     * Amount still needed to reach optimum goal.
     * Null if optimum already reached.
     */
    needForOptimum?: Money | null;
}

// GOTEO-OC-DONATION-CERTIFICATE: certificate request/response types are exclusive to the
// donation-certificate feature of Goteo under Fundación Platoniq, hidden in the open-core.
// Re-enable when a feature toggle exists. Do not delete.
//
// /**
//  * Certificate Request Payload
//  *
//  * Request body for POST /v4/users/me/certificates
//  */
// export interface CertificateRequest {
//     /**
//      * Period for which to generate certificate (e.g., "2025", "2024")
//      */
//     period: string;
//     /**
//      * Optional: Specific donation IDs to include in certificate.
//      * If omitted, includes all donations in the period.
//      */
//     donationIds?: string[];
// }
//
// /**
//  * Certificate Response
//  *
//  * Response from certificate generation endpoint.
//  */
// export interface CertificateResponse {
//     /**
//      * Unique identifier for the generated certificate
//      */
//     certificateId: string;
//     /**
//      * Download URL for the certificate PDF
//      */
//     downloadUrl: string;
//     /**
//      * ISO 8601 date string when the download link expires
//      */
//     expiresAt: string;
//     /**
//      * Total amount covered by the certificate (minor units)
//      */
//     totalAmount: Money;
//     /**
//      * Number of donations included in the certificate
//      */
//     donationCount: number;
// }

/**
 * Period Option
 *
 * Represents a selectable period option in the period dropdown filter.
 */
export interface PeriodOption {
    /**
     * Year value (e.g., "2025", "2024")
     */
    value: string;
    /**
     * Localized label for display (e.g., "Año 2025")
     */
    label: string;
}

/**
 * Matchfunding Activity
 *
 * Contains user's matchfunding call management data.
 * Only present if user manages one or more matchfunding calls.
 */
export interface MatchfundingActivity {
    /**
     * Total number of matchfunding calls managed by the user
     */
    totalCalls: number;
    /**
     * Total amount donated across all matchfunding calls (minor units)
     */
    totalDonated: Money;
    /**
     * Active matchfunding calls managed by the user
     */
    activeCalls: MatchfundingCall[];
}

/**
 * Matchfunding Call
 *
 * Represents a single matchfunding call with metrics.
 */
export interface MatchfundingCall {
    /**
     * Unique matchfunding call identifier
     */
    id: number;
    /**
     * Matchfunding call title
     */
    title: string;
    /**
     * Matchfunding call description
     */
    description: string;
    /**
     * Matchfunding call slug for URL construction
     */
    slug: string;
    /**
     * Background image URL for the call card (optional)
     */
    imageUrl?: string;
    /**
     * Logo image URL for the call card (optional)
     */
    logo?: string;
    /**
     * Total donation amount allocated to this call (minor units)
     */
    donationAmount: Money;
    /**
     * Number of projects that have received funding from this call
     * (obtained via ProjectSupport API filtering by call's accounting)
     */
    participatingProjects: number;
    /**
     * Number of projects that have been accepted into this call
     * (obtained via MatchCallSubmission API filtering by status=accepted)
     */
    successfulProjects: number;
    /**
     * Call status (e.g., "active", "closed")
     */
    status: string;
    /**
     * Territory/region code for the call (optional)
     */
    territory?: string;
}

/**
 * Matchfunding Card Data
 *
 * Summary data for the matchfunding activity card.
 */
export interface MatchfundingCardData {
    /**
     * Total number of matchfunding calls managed
     */
    totalCalls: number;
    /**
     * Total amount donated across all calls (minor units)
     */
    totalDonated: Money;
    /**
     * Recent calls for preview (typically limited to 2-3 calls)
     */
    recentCalls: Array<{
        id: number;
        title: string;
        donationAmount: Money;
    }>;
}
