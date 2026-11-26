import { isSupportedLocale } from "../i18n/locales/index";
import { apiPingGet } from "../openapi/client/sdk.gen";

import type { APIContext } from "astro";

const API_HEALTHY_TTL = 30_000;
const API_PING_TIMEOUT = 3_000;

let apiHealthyUntil = 0;

/**
 * Whether the API answers its health endpoint.
 *
 * Pages read from the API while their HTML is already streaming, so a dead API cannot be
 * turned into an error page from there. Asking before rendering starts is what lets the
 * middleware serve the 500 page instead.
 *
 * Only a healthy answer is remembered, so an outage is noticed within the TTL and a
 * recovery on the very next request.
 */
// ponytail: per-isolate memo. Move to the Cache API if isolates churn enough to matter.
export async function isApiUp(): Promise<boolean> {
    if (Date.now() < apiHealthyUntil) return true;

    const { response } = await apiPingGet({ signal: AbortSignal.timeout(API_PING_TIMEOUT) });

    if (!response?.ok) return false;

    apiHealthyUntil = Date.now() + API_HEALTHY_TTL;

    return true;
}

const PREFERRED_LANGUAGE_COOKIE = "preferred-lang";
const PREFERRED_LANGUAGE_HEADER = "accept-language";

/**
 * Builds a clean redirect URL by combining the language code and pathname.
 */
export function buildRedirectUrl(lang: string, pathname: string): string {
    const cleanPath = pathname.replace(/^\/+|\/+$/g, "");

    return `/${lang}${cleanPath ? `/${cleanPath}` : ""}`;
}

/**
 * Detects the language preferences from URL path, preferred-lang cookie and Accept-Language header.
 * @param context
 * @returns {string[]} A sorted list of language codes. Languages first in the list have a higher preference.
 */
export function getUserLangPreferences(context: APIContext): string[] {
    let langs: string[] = [];

    const langInPath = parsePathLang(context.url.pathname);
    if (langInPath) {
        langs = [...langs, langInPath];
    }

    const langInCookie = context.cookies.get(PREFERRED_LANGUAGE_COOKIE)?.value;
    if (langInCookie) {
        langs = [...langs, langInCookie];
    }

    const langsInHeader = parseAcceptLanguageHeader(
        context.request.headers.get(PREFERRED_LANGUAGE_HEADER),
    );
    if (langsInHeader?.length > 0) {
        langs = [...langs, ...langsInHeader.map((lang) => lang.code)];
    }

    return [...new Set(langs)];
}

/**
 * Detect the working language by checking the request preferences that have an available localisation.
 * Fallsback to application default `PUBLIC_DEFAULT_LANGUAGE` when no available language was found.
 * @param context
 * @returns {string} A language code of one of the available localisations.
 */
export function getLanguage(context: APIContext): string {
    const defaultLang = import.meta.env.PUBLIC_DEFAULT_LANGUAGE;
    const userPreferredLangs = getUserLangPreferences(context);

    if (userPreferredLangs.length < 1) {
        return defaultLang;
    }

    for (const lang of userPreferredLangs) {
        if (isSupportedLocale(lang)) {
            return lang;
        }
    }

    return defaultLang;
}

/**
 * Remembers the working language so that unprefixed URLs keep serving it on later visits.
 *
 * Writes nothing when the cookie already holds this language: a response carrying a
 * `Set-Cookie` belongs to the visitor it was built for and must never be stored at the
 * edge, so rewriting an unchanged value would make every response uncacheable.
 *
 * @returns Whether a `Set-Cookie` was queued for this response.
 */
export function persistLanguage(context: APIContext, lang: string): boolean {
    if (context.cookies.get(PREFERRED_LANGUAGE_COOKIE)?.value === lang) {
        return false;
    }

    context.cookies.set(PREFERRED_LANGUAGE_COOKIE, lang, {
        path: "/",
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 365,
    });

    return true;
}

/**
 * Detects the user's preferred locale from the Accept-Language HTTP header.
 * @returns A sorted list of the locales from the header
 */
export function parseAcceptLanguageHeader(header: string | null): { code: string; q: number }[] {
    if (!header) return [];

    const languages = header.split(",").map((lang) => {
        const [code, qValue] = lang.trim().split(";q=");

        return {
            code: code.toLowerCase().split("-")[0],
            q: qValue ? parseFloat(qValue) : 1.0,
        };
    });

    return languages.sort((a, b) => b.q - a.q);
}

export function parsePathLang(path: string): string | null {
    const firstSegment = path.split("/")[1];

    if (isSupportedLocale(firstSegment)) {
        return firstSegment;
    }

    return null;
}
