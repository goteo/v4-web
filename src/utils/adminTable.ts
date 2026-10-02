import { getCookie } from "./cookies";

export const ADMIN_ITEMS_PER_PAGE_OPTIONS = [10, 20, 30, 50] as const;

export type AdminItemsPerPage = (typeof ADMIN_ITEMS_PER_PAGE_OPTIONS)[number];

export const ADMIN_ITEMS_PER_PAGE_COOKIE = "admin-items-per-page";

export const DEFAULT_ITEMS_PER_PAGE: AdminItemsPerPage = 10;

export function isValidItemsPerPage(value: number): value is AdminItemsPerPage {
    return (ADMIN_ITEMS_PER_PAGE_OPTIONS as readonly number[]).includes(value);
}

export function getInitialItemsPerPage(cookie = ADMIN_ITEMS_PER_PAGE_COOKIE): AdminItemsPerPage {
    if (typeof document === "undefined") return DEFAULT_ITEMS_PER_PAGE;

    const raw = getCookie(cookie);
    if (!raw) return DEFAULT_ITEMS_PER_PAGE;

    const parsed = Number(raw);
    return isValidItemsPerPage(parsed) ? parsed : DEFAULT_ITEMS_PER_PAGE;
}
