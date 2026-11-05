import { get, writable, type Writable } from "svelte/store";

import type { Session } from "./types";

export const session: Writable<Session | undefined> = writable();

let pendingRefresh: Promise<Session | undefined> | undefined;

/**
 * Re-reads the session from the server. `/api/session` refreshes an expired access
 * token before returning it, which keeps long-lived tabs signed in instead of
 * sending a token the API will reject.
 *
 * Concurrent callers share the same request: several API calls can notice the stale
 * token at once (the project preview fetches the owner and the accounting in parallel).
 */
export function refreshSession(): Promise<Session | undefined> {
    pendingRefresh ??= (async () => {
        try {
            const response = await fetch("/api/session", {
                headers: { Accept: "application/json" },
                cache: "no-store",
            });

            if (!response.ok) {
                return get(session);
            }

            const data = (await response.json()) as Session | null;
            const current = data ? { ...data, expires_at: new Date(data.expires_at) } : undefined;

            session.set(current);

            return current;
        } catch (error) {
            console.error("Session refresh failed:", error);

            return get(session);
        }
    })().finally(() => {
        pendingRefresh = undefined;
    });

    return pendingRefresh;
}
