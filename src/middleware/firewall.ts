import { getFreshSession, getSession } from "../auth/session";
import { allowsCachedSession, getMatchingACL, isAuthorized } from "../firewall";
import { isSameHost } from "../utils/requests";

import type { Session } from "../auth/types";
import type { APIContext } from "astro";

export type FirewallResult =
    | { type: "ok" }
    | { type: "unauthorized" }
    | { type: "forbidden" }
    | { type: "basic-auth"; response: Response };

/**
 * Load the session for this request, re-fetching the User from the API unless the path
 * is listed in `CACHED_SESSION_PATHS`.
 */
export async function resolveSession(context: APIContext): Promise<Session | undefined> {
    return allowsCachedSession(context.url.pathname)
        ? await getSession(context.cookies)
        : await getFreshSession(context.cookies);
}

export async function checkAuth(
    context: APIContext,
    session: Session | undefined,
): Promise<FirewallResult> {
    const exemptAuth = withAuthExemption(context);
    if (exemptAuth) {
        return exemptAuth;
    }

    const basicAuth = withBasicAuth(context);
    if (basicAuth) {
        return basicAuth;
    }

    const aclAuth = withACL(context, session);
    if (aclAuth) {
        return aclAuth;
    }

    return { type: "ok" };
}

export function withAuthExemption(context: APIContext): FirewallResult | null {
    try {
        if (isSameHost(context.request) && context.url.pathname.startsWith("/api/relay")) {
            return { type: "ok" };
        }
    } catch {
        // If the request could not be determined as self-host simply continue
    }

    return null;
}

export function withBasicAuth(context: APIContext): FirewallResult | null {
    const hasBasicAuth = import.meta.env.BASIC_AUTH;

    if (!hasBasicAuth || hasBasicAuth !== "true") {
        return null;
    }

    const username = import.meta.env.BASIC_AUTH_USERNAME;
    const password = import.meta.env.BASIC_AUTH_PASSWORD;

    const authorization = context.request.headers.get("authorization");

    if (!authorization || !authorization.startsWith("Basic ")) {
        return {
            type: "basic-auth",
            response: new Response("Authentication required", {
                status: 401,
                headers: {
                    "WWW-Authenticate": 'Basic realm="Protected Area"',
                },
            }),
        };
    }

    const base64Credentials = authorization.slice(6);
    const credentials = atob(base64Credentials);
    const [providedUsername, providedPassword] = credentials.split(":");

    if (providedUsername !== username || providedPassword !== password) {
        return {
            type: "basic-auth",
            response: new Response("Authentication failed", {
                status: 401,
                headers: {
                    "WWW-Authenticate": 'Basic realm="Protected Area"',
                },
            }),
        };
    }

    return null;
}

export function withACL(context: APIContext, session: Session | undefined): FirewallResult | null {
    const acl = getMatchingACL(context.url.pathname);

    if (!acl) {
        return null;
    }

    if (!session || session.user.roles === undefined) {
        return { type: "unauthorized" };
    }

    if (!isAuthorized(acl, session.user.roles)) {
        return { type: "forbidden" };
    }

    return null;
}
