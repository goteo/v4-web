import { defineMiddleware } from "astro:middleware";

import { checkAuth, resolveSession } from "./firewall";
import { getLanguage, getUserLangPreferences, persistLanguage } from "./utils";
import { useTranslations } from "../i18n/utils";
import { headerLogoRepository } from "../repositories/headerLogo";
import { goto } from "../utils/navigation";

import type { Locale } from "../i18n/locales/index";
import type { HeaderLogo } from "../repositories/headerLogo";
import type { APIContext } from "astro";

/**
 * The active header logo, resolved before rendering so the header shows it from the first
 * paint instead of swapping it in after hydration.
 *
 * Endpoints and actions render no header, so they skip the query. A failing read falls back
 * to the built-in logo rather than failing the page.
 * @param pathname The requested path
 * @returns The logo to render, or null for the built-in one
 */
async function loadHeaderLogo(pathname: string): Promise<HeaderLogo | null> {
    if (pathname.startsWith("/api/") || pathname.startsWith("/_actions/")) return null;

    try {
        const logo = await headerLogoRepository.getActive();

        return logo ? { src: logo.mediaUrl, alt: logo.altText } : null;
    } catch (e) {
        console.error("Header logo read failed:", e);
        return null;
    }
}

export const onRequest = defineMiddleware(async (context: APIContext, next) => {
    const session = await resolveSession(context);

    const auth = await checkAuth(context, session);
    switch (auth.type) {
        case "basic-auth":
            return auth.response;
        case "unauthorized": {
            const callback = context.url.pathname + context.url.search;

            return goto("/login", { query: { callback } });
        }
        case "forbidden":
            return context.rewrite("/403");
    }

    let storedLanguage: boolean | undefined;

    try {
        const lang = getLanguage(context) as Locale;
        const langs = getUserLangPreferences(context);

        // Only remember a language the visitor actually asked for, never the fallback.
        storedLanguage = langs.includes(lang) && persistLanguage(context, lang);

        context.locals.lang = lang;
        context.locals.langs = langs;
        context.locals.t = useTranslations(lang);
        context.locals.session = session;
    } catch (e) {
        if (e instanceof Response) {
            return e;
        }
        throw e;
    }

    context.locals.headerLogo = await loadHeaderLogo(context.url.pathname);

    let response: Response;

    try {
        response = await next();
    } catch (error) {
        console.error("[middleware] Unhandled request error");

        if (error instanceof Error) {
            console.error(error.stack ?? error.message);
        } else {
            console.error(error);
        }

        throw error;
    }

    /**
     * Which routes may be cached is declared in `astro.config.mjs`, but whether this
     * particular response may be stored is only known once it has been built. A signed-in
     * visitor or a queued `Set-Cookie` both mean the response belongs to one person, and
     * the edge would replay it to everyone else requesting the same URL.
     *
     * Cookies queued through `context.cookies` are written onto the response after
     * middleware returns, so they cannot be detected by reading its headers — hence the
     * explicit flag alongside the header check, which covers cookies set directly on a
     * Response by a route.
     *
     * Only successful responses are worth storing. A redirect or a 404 usually means the
     * resource is missing for now, and holding onto it would keep serving that answer
     * long after the resource exists.
     */
    if (
        !response.ok ||
        context.locals.session ||
        storedLanguage ||
        response.headers.has("set-cookie")
    ) {
        context.cache.set(false);
    }

    return response;
});
