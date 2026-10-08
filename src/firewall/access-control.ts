export type ControlItem = {
    path: string;
    roles: string[];
};

export const ACL: ControlItem[] = [
    {
        path: "/project/.*/edit",
        roles: ["ROLE_USER"],
    },
    {
        path: "/project/.*/manage",
        roles: ["ROLE_USER"],
    },
    {
        path: "/admin",
        roles: ["ROLE_ADMIN"],
    },
];

/**
 * Paths that can trust the session stored in the cookie, skipping the User re-fetch
 * from the API. Every other path gets the User's current roles on each request.
 */
export const CACHED_SESSION_PATHS: string[] = ["/api/relay"];
