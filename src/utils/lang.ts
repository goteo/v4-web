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
