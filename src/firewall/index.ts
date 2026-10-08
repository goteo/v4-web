import { ACL, CACHED_SESSION_PATHS, type ControlItem } from "./access-control";
import { isSupportedLocale } from "../i18n/locales";

const regexCache = new Map<string, RegExp>();

function normalizePath(pathname: string): string {
    const path = pathname.replace(/\/+$/, "");

    const segments = path.split("/").filter(Boolean);

    if (segments.length > 0 && isSupportedLocale(segments[0])) {
        segments.shift();
    }

    return "/" + segments.join("/");
}

function isValidRegex(pattern: string): boolean {
    try {
        new RegExp(pattern);
        return true;
    } catch {
        return false;
    }
}

function getRegex(path: string): RegExp {
    if (!regexCache.has(path)) {
        regexCache.set(path, new RegExp(`^${path}$`));
    }

    return regexCache.get(path)!;
}

/**
 * Checks if a pathname matches a given path.
 * @param pathname The pathname to check, e.g. "/admin/dashboard"
 * @param path The path to match against, which can be an exact path (e.g. "/admin") or a regex pattern (e.g. "/admin/.*")
 * @returns True if the pathname matches the path, false otherwise
 */
function matchesPath(pathname: string, path: string): boolean {
    // Exact match
    if (pathname === path) {
        return true;
    }

    // Dynamic regex route
    if (isValidRegex(path)) {
        if (getRegex(path).test(pathname)) {
            return true;
        }
    }

    // Nested routes
    return pathname.startsWith(path + "/");
}

export function getMatchingACL(pathname: string): ControlItem | null {
    const normalized = normalizePath(pathname);

    for (const item of ACL) {
        if (matchesPath(normalized, item.path)) {
            return item;
        }
    }

    return null;
}

/**
 * Checks if a pathname can use the session stored in the cookie without re-fetching the User.
 * @param pathname The pathname to check, e.g. "/api/relay/v4/projects"
 * @returns True if the cached session is enough, false if it must be refreshed
 */
export function allowsCachedSession(pathname: string): boolean {
    const normalized = normalizePath(pathname);

    return CACHED_SESSION_PATHS.some((path) => matchesPath(normalized, path));
}

/**
 * Checks if a user is authorized to access a control item.
 * @param control The control item (ACL) to check authorization for
 * @param roles The roles of the current user
 * @returns True if the user is authorized, false otherwise
 */
export function isAuthorized(control: ControlItem, roles: string[]): boolean {
    if (control.roles.length === 0) {
        return true;
    }

    return control.roles.some((role) => roles.includes(role));
}
