import type { Address } from "../openapi/client";

/** One-line summary of an Address, with the country name in the given language. */
export function formatAddress(address: Address, lang: Intl.LocalesArgument): string {
    const country =
        address.country && new Intl.DisplayNames(lang, { type: "region" }).of(address.country);

    return [
        `${address.firstName} ${address.lastName}`,
        [address.line1, address.line2].filter(Boolean).join(", "),
        `${address.postCode} ${address.city}`,
        country ?? address.country,
    ].join(" · ");
}
