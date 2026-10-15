import iso3166 from "iso-3166-2";

import type { Territory } from "../openapi/client";

/**
 * The API stores a territory without a country as this ISO 3166-1 "user assigned" code. It is what
 * `Territory::__construct()` falls back to, so forms must treat it as no country at all.
 */
export const UNKNOWN_COUNTRY_CODE = "ZZ";

export function getTerritoryDisplayName(territory: Territory, lang: Intl.LocalesArgument): string {
    const countryNames = new Intl.DisplayNames(lang, { type: "region" });
    const country = countryNames.of(territory.country!);

    const tag = territory.subLvl2 ?? territory.subLvl1;
    if (!tag) {
        return country!;
    }

    const iso = iso3166.subdivision(tag!);
    if (!iso || !iso.name) {
        return country!;
    }

    const subdivision = iso.name.split(",")[0];

    return `${subdivision}, ${country}`;
}
