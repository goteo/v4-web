import { getDefaultLanguage } from "./consts";

export function getLanguageDisplayName(lang: string): string | undefined {
    let displayName: string | undefined;

    try {
        displayName = new Intl.DisplayNames(lang, { type: "language" }).of(lang);
    } catch {
        return;
    }

    if (!displayName || displayName === lang) return;

    return displayName.charAt(0).toUpperCase() + displayName.slice(1);
}

/**
 * The language a translatable row is stored in: the platform one while present, else the first.
 * @param languages The languages the content has, in order
 * @param defaultLanguage The platform language
 * @returns The base language; the rest are stored as translations
 */
export function primaryLanguage(
    languages: string[],
    defaultLanguage = getDefaultLanguage(),
): string {
    return languages.includes(defaultLanguage) ? defaultLanguage : languages[0];
}
