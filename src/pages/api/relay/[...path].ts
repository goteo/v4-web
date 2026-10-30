import { getSession } from "../../../auth/session";

import type { APIRoute } from "astro";

// Whitelist of safe response headers to forward to the client
const SAFE_RESPONSE_HEADERS = [
    "content-type",
    "content-language",
    "content-length",
    "cache-control",
    "etag",
    "last-modified",
    "expires",
    "vary",
];

const UNSAFE_REQUEST_HEADERS = ["host", "content-length", "connection", "transfer-encoding"];

/**
 * API Relay Endpoint
 *
 * This endpoint acts as a server-side proxy for authenticated API requests.
 * It prevents exposing user tokens on the client-side by:
 * 1. Accepting requests from the client without auth headers
 * 2. Adding authentication headers on the server-side
 * 3. Forwarding the request to the actual API
 * 4. Returning the response back to the client
 *
 * Usage from client:
 * ```ts
 * const { data, err } = await apiProjectsPost({ baseUrl: '/api/relay', ... });
 * const response = await fetch('/api/relay/v4/users/123', ...;
 * ```
 */
export const ALL: APIRoute = async ({ request, cookies, params }) => {
    try {
        const query = new URL(request.url).search;
        const url = `${import.meta.env.PUBLIC_API_URL}/${params.path}${query}`;

        const reqHeaders = new Headers(request.headers);
        for (const header of UNSAFE_REQUEST_HEADERS) {
            reqHeaders.delete(header);
        }

        const session = await getSession(cookies);
        if (session && session.token.asHttpHeaders) {
            for (const [key, value] of Object.entries(session.token.asHttpHeaders)) {
                reqHeaders.set(key, value);
            }
        }

        let reqBody: string | null = null;
        if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
            reqBody = await request.text();
        }

        const response = await fetch(url, {
            method: request.method,
            headers: reqHeaders,
            body: reqBody,
        });

        const resBody = await response.text();

        const resHeaders = new Headers();
        response.headers.forEach((value, key) => {
            if (SAFE_RESPONSE_HEADERS.includes(key.toLowerCase())) {
                resHeaders.set(key, value);
            }
        });

        if (!resHeaders.has("content-type")) {
            resHeaders.set("content-type", "application/json");
        }

        /**
         * Authenticated responses carry per-user data. The upstream API marks every
         * response as publicly cacheable, and browsers may serve a stale GET from the
         * HTTP cache after a mutation (e.g. a Reward just deleted) for up to an hour.
         * Never allow that for logged-in users.
         */
        if (session) {
            resHeaders.set("cache-control", "no-store");
            resHeaders.delete("etag");
            resHeaders.delete("last-modified");
            resHeaders.delete("expires");
        }

        return new Response(resBody, {
            status: response.status,
            statusText: response.statusText,
            headers: resHeaders,
        });
    } catch (error) {
        console.error("API Relay Error:", error);

        return new Response(
            JSON.stringify({
                error: "Internal Server Error",
                message: error instanceof Error ? error.message : "Unknown error",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
};
