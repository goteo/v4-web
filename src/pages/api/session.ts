import { OAuthError, passwordGrant } from "../../auth/grant";
import { buildSession, setSession } from "../../auth/session";

import type { APIRoute } from "astro";

/**
 * Maps the OAuth2 error codes returned by the token endpoint to descriptive,
 * localized messages. The key is returned to the client, which translates it,
 * so a missing translation can never leak a raw key to the user.
 */
const LOGIN_ERROR_KEYS: Record<string, string> = {
    invalid_grant: "pages.checkout.login.error.invalidCredentials",
    invalid_client: "pages.checkout.login.error.clientAuthentication",
    unauthorized_client: "pages.checkout.login.error.clientAuthentication",
    invalid_request: "pages.checkout.login.error.invalidRequest",
};

function loginErrorKey(error: unknown): string {
    if (error instanceof OAuthError && error.code && LOGIN_ERROR_KEYS[error.code]) {
        return LOGIN_ERROR_KEYS[error.code];
    }

    return "pages.checkout.login.error.unexpectedLogin";
}

/**
 * Exposes the current session to client-side code.
 */
export const GET: APIRoute = ({ locals }) => {
    return new Response(JSON.stringify(locals.session ?? null), {
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, no-store",
        },
    });
};

/**
 * Handles the POST request to log in using the OAuth2 password grant.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const body = (await request.json()) as { identifier?: string; password?: string };
        const { identifier, password } = body;

        if (typeof identifier !== "string" || typeof password !== "string") {
            return new Response(
                JSON.stringify({ error: "pages.checkout.login.error.invalidCredentials" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        const token = await passwordGrant({ identifier, password });

        const session = await buildSession(token);

        setSession(cookies, session);

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error(err);

        return new Response(JSON.stringify({ error: loginErrorKey(err) }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }
};
