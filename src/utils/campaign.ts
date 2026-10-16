import type { ProjectCalendar } from "../openapi/client";

const DAY_MS = 1000 * 60 * 60 * 24;

/** End date of the round in progress (minimum, then optimum), or `undefined` once both have passed. */
export function getCurrentDeadline(calendar: ProjectCalendar): Date | undefined {
    const now = new Date();

    const minimum = new Date(calendar.minimum!);
    if (now < minimum) {
        return minimum;
    }

    if (!calendar.optimum) {
        return undefined;
    }

    const optimum = new Date(calendar.optimum);
    if (now < optimum) {
        return optimum;
    }

    return undefined;
}

export function getDaysRemaining(calendar?: ProjectCalendar): number | undefined {
    const deadline = calendar?.minimum ? getCurrentDeadline(calendar) : undefined;
    return deadline ? Math.ceil((deadline.getTime() - Date.now()) / DAY_MS) : undefined;
}
