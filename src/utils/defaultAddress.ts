import type { Address } from "../openapi/client";

/**
 * An Address with the default flag the web expects from the API.
 *
 * Pending in the API: no field marks the default Address yet, so `isDefault` is never set and the
 * first Address stays the default. Once the API exposes it and the SDK is regenerated, use
 * `Address` directly and drop this type (rename the field here if it lands under another name).
 */
export type DefaultableAddress = Address & { isDefault?: boolean };

/** The User's default Address: the one the API flags, else the first one. */
export function getDefaultAddress(addresses: DefaultableAddress[]): Address | undefined {
    return addresses.find((address) => address.isDefault) ?? addresses[0];
}
