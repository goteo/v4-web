import { refreshToken } from "./grant";
import { decodeJWT } from "./jwt";
import { apiAccountingsIdGet, apiUsersIdOrHandleGet } from "../openapi/client";
import { extractId } from "../utils/extractId";

import type { OAuthToken, Session } from "./types";
import type { AstroCookies } from "astro";

const COOKIE_NAME = "session";

/**
 * Retrieve the session data from session cookie
 * @param cookies AstroCookies interface
 * @returns The Session data
 */
export async function getSession(cookies: AstroCookies): Promise<Session | undefined> {
    const auth = cookies.get(COOKIE_NAME);

    if (!auth) return undefined;

    const session: Session = auth.json();
    session.expires_at = new Date(session.expires_at);

    if (!isExpired(session)) {
        return session;
    }

    try {
        const token = await refreshToken(session.token);
        const fresh = await buildSession(token);

        setSession(cookies, fresh);

        return fresh;
    } catch (err) {
        console.error(err);
        clearSession(cookies);

        return undefined;
    }
}

/**
 * Retrieve the session with the User re-fetched from the API, so that role checks
 * use the roles the API has now and not the ones stored in the cookie at login.
 * The cookie is rewritten only when the roles changed.
 * @param cookies AstroCookies interface
 * @returns The Session data, or `undefined` if the User could not be fetched
 */
export async function getFreshSession(cookies: AstroCookies): Promise<Session | undefined> {
    const session = await getSession(cookies);

    if (!session) return undefined;

    try {
        const { data: user } = await apiUsersIdOrHandleGet({
            path: { idOrHandle: decodeJWT(session.token.access_token).sub },
            headers: session.token.asHttpHeaders,
        });

        if (!user) return undefined;

        const fresh = { ...session, user };

        if (JSON.stringify(user.roles) !== JSON.stringify(session.user.roles)) {
            setSession(cookies, fresh);
        }

        return fresh;
    } catch (err) {
        console.error(err);

        return undefined;
    }
}

/**
 * Store the session data into a secure, http-only cookie
 * @param cookies AstroCookies interface
 * @param session The Session data
 */
export function setSession(cookies: AstroCookies, session: Session) {
    cookies.set(COOKIE_NAME, session, {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
    });
}

/**
 * Delete the session data from session cookie
 * @param cookies AstroCookies interface
 */
export function clearSession(cookies: AstroCookies) {
    cookies.delete(COOKIE_NAME, { path: "/" });
}

/**
 * Checks if a given session is expired
 * @param session The session to check for expiration
 * @param margin Time (in ms) of margin to consider a session expired before the actual expiration date
 * @returns `true` if the given session is expired
 */
export function isExpired(session: Session, margin: number = 300000): boolean {
    return Date.now() >= session.expires_at.getTime() - margin;
}

/**
 * Obtain session data from a given OAuth token
 * @param token An OAuth /token response
 * @returns A storable Session object
 */
export async function buildSession(token: OAuthToken): Promise<Session> {
    const jwt = decodeJWT(token.access_token);

    const expiresAt = new Date(jwt.exp * 1000);

    if (new Date() > expiresAt) {
        throw new Error("Cannot build a Session from an expired token");
    }

    const { data: user } = await apiUsersIdOrHandleGet({
        path: { idOrHandle: jwt.sub },
        headers: token.asHttpHeaders,
    });

    if (!user) {
        throw new Error("The User of the token does not exist");
    }

    const { data: accounting } = await apiAccountingsIdGet({
        path: { id: extractId(user.accounting)! },
        headers: token.asHttpHeaders,
    });

    if (!accounting) {
        throw new Error("Could not retrieve Accounting for the User of the token");
    }

    return {
        token,
        user,
        expires_at: expiresAt,
        accounting,
    };
}
