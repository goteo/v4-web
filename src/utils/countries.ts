import iso3166 from "iso-3166-2";

/**
 * Every country as `{ code, name }`, sorted by name in the given language, ready to feed a `Select`.
 *
 * The API stores and validates the country as an ISO 3166-1 alpha-2 string but exposes no list of
 * them, so the options are built from the ISO data here and the names localized with `Intl`.
 */
export function getCountries(lang: Intl.LocalesArgument): { code: string; name: string }[] {
    const names = new Intl.DisplayNames(lang, { type: "region" });

    return Object.keys(iso3166.data)
        .map((code) => ({ code, name: names.of(code) ?? code }))
        .sort((a, b) => a.name.localeCompare(b.name, lang));
}
