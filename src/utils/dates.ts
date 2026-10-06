import type { Locale } from "../i18n/locales";

export function formatDate(date: Date, locale: Locale) {
    const options: Intl.DateTimeFormatOptions = {
        day: "2-digit",
        month: "short",
        year: "numeric",
    };

    return date.toLocaleDateString(locale, options);
}

/**
 * The clock time a moment fell on, without the date.
 * @param date The moment to write out
 * @param locale Active locale, which sets the time separator
 * @returns The hours and minutes, as "HH:mm"
 */
export function formatTime(date: Date, locale: Locale) {
    const options: Intl.DateTimeFormatOptions = {
        hour: "2-digit",
        minute: "2-digit",
    };

    return date.toLocaleTimeString(locale, options);
}

/**
 * The first instant of the day for the given date (midnight, 00:00).
 * @param date The date to normalize
 * @returns A new Date set to the start of the given day
 */
export function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * The last instant of the day for the given date (23:59:59.999).
 * Derived from the start of the following day rather than hardcoding the end-of-day time.
 * @param date The date to normalize
 * @returns A new Date set to the end of the given day
 */
export function endOfDay(date: Date): Date {
    // Start of the next day, minus a single millisecond
    const nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    return new Date(nextDay.getTime() - 1);
}

/**
 * Get a date `n` ms from now
 * @param offset Milliseconds since now until future date
 * @returns {Date}
 */
export function getDateInFuture(offset: number): Date {
    const now = new Date();
    now.setTime(now.getTime() + offset);

    return now;
}

/**
 * Parses an ISO-like date string. Replaces partial values and wildcards `*` with the appropriate current value.
 * @param raw
 * @param now
 * @returns
 */
export function parseDate(raw: string | undefined, now: Date = new Date()): Date | undefined {
    if (!raw) return undefined;

    const parts = raw.split("-");

    if (
        parts.length < 1 ||
        parts.length > 3 ||
        !/^(?:\d{4}|\*)$/.test(parts[0]) ||
        parts.slice(1).some((part) => !/^(?:\d{2}|\*)$/.test(part))
    ) {
        console.warn(`Invalid value: ${raw}`);
        return undefined;
    }

    const year = parts[0] === "*" ? now.getFullYear() : Number(parts[0]);

    const month =
        parts[1] === undefined || parts[1] === "*" ? now.getMonth() + 1 : Number(parts[1]);

    const day = parts[2] === undefined || parts[2] === "*" ? now.getDate() : Number(parts[2]);

    return new Date(year, month - 1, day);
}

/**
 * Latest date a project may start its campaign, as configured by the platform owner.
 * Calculated from `PUBLIC_CAMPAIGN_MAX_END_DATE`. Leave empty to disable the limit.
 */
export const CAMPAIGN_MAX_END_DATE = parseDate(import.meta.env.PUBLIC_CAMPAIGN_MAX_END_DATE);

function getMinStartDate() {
    const minStartDate = getDateInFuture(
        86400000 * parseInt(import.meta.env.PUBLIC_CAMPAIGN_MIN_REV_DAYS || 1),
    );

    minStartDate.setHours(0, 0, 0);

    return minStartDate;
}

/**
 * Earliest date a project may start its campaign, as calculated from the platform's minimum review days.
 * Calculated from `PUBLIC_CAMPAIGN_MIN_REV_DAYS`. When empty will default to 1 day from now.
 */
export const CAMPAIGN_MIN_START_DATE = getMinStartDate();
