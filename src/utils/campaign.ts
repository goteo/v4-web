import type { Project } from "../openapi/client";

const DAY_MS = 1000 * 60 * 60 * 24;

type CampaignTiming = Pick<Project, "status" | "deadline" | "calendar">;

/**
 * End date of the round in progress, or `undefined` when the project is not in campaign.
 * Counts towards `minimum`; once passed, towards `optimum` only if the project's deadline is
 * `optimum`.
 */
export function getCurrentDeadline({
    status,
    deadline,
    calendar,
}: CampaignTiming): Date | undefined {
    if (status !== "in_campaign" || !calendar?.minimum) {
        return undefined;
    }

    const now = new Date();
    const minimum = new Date(calendar.minimum);
    if (now < minimum) {
        return minimum;
    }

    if (deadline !== "optimum" || !calendar.optimum) {
        return undefined;
    }

    const optimum = new Date(calendar.optimum);
    return now < optimum ? optimum : undefined;
}

export function getDaysRemaining(project: CampaignTiming): number | undefined {
    const deadline = getCurrentDeadline(project);
    return deadline ? Math.ceil((deadline.getTime() - Date.now()) / DAY_MS) : undefined;
}
