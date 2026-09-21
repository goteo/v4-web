import { getDefaultCurrency, getDefaultLanguage } from "./consts";
import { currencySymbols } from "./currencyData";

import type { Money } from "../openapi/client";

function getSeparators(currency: string) {
    const locale = getDefaultLanguage();
    const example = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
    }).format(1234567.89);

    const parts = example.match(/1(.+)234(.+)567(.+)89/);
    if (!parts) throw new Error("Unable to detect separators from locale");

    const groupSep = parts[1];
    const decimalSep = parts[3];

    return { groupSep, decimalSep };
}

/**
 * Parse a currency-like numeric string into a number
 * @param value {string}
 */
export function parseCurrency(value: string, currency?: string): number {
    if (currency === undefined) currency = getDefaultCurrency();
    const locale = getDefaultLanguage();

    const { groupSep, decimalSep } = getSeparators(currency);
    const { minimumFractionDigits: scale } = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
    }).resolvedOptions();

    const cleaned = value
        .replace(new RegExp("\\" + groupSep, "g"), "")
        .replace(new RegExp("\\" + decimalSep), ".")
        .replace(/[^0-9.]/g, "");

    const parts = cleaned.split(".");

    const intPart = parts[0];
    const decPart = (parts[1] || "").padEnd(scale!, "0").slice(0, scale);

    const result = intPart + decPart;

    return parseInt(result, 10);
}

export type FormatOptions = {
    asLocaleString?: boolean;
    locale?: string;
};

export function formatCurrency(money: Money | undefined | null, options?: FormatOptions): string;
export function formatCurrency(
    amount?: number,
    currency?: string | null,
    options?: FormatOptions,
): string;
export function formatCurrency(
    amountOrMoney?: number | Money | null,
    currencyOrOptions?: string | null | FormatOptions,
    options?: FormatOptions,
): string {
    if (amountOrMoney == null) return "";
    if (typeof amountOrMoney === "object" && "currency" in amountOrMoney) {
        const money = amountOrMoney as Money;
        const opts = currencyOrOptions as FormatOptions | undefined;
        return formatUnits(money.amount ?? 0, money.currency ?? getDefaultCurrency(), opts);
    }
    return formatUnits(
        amountOrMoney as number | undefined,
        (currencyOrOptions as string | null | undefined) ?? null,
        options,
    );
}

function formatUnits(
    amount?: number,
    currency?: string | null,
    options: FormatOptions = {},
): string {
    if (amount === undefined) return "";
    if (currency === undefined || currency === null) currency = getDefaultCurrency();

    const currencyData = currencySymbols[currency];
    if (!currencyData) return "";

    const { decimals } = currencyData;
    const rawAmount = amount / Math.pow(10, decimals);
    const hasDecimals = rawAmount % 1 !== 0;
    const formattedAmount = hasDecimals ? rawAmount.toFixed(decimals) : rawAmount.toFixed(0);

    // Default to true for backward compatibility
    const asLocaleString = options.asLocaleString ?? true;

    // Use provided locale or fall back to default language
    const locale = options.locale ?? getDefaultLanguage();
    const formatter = new Intl.NumberFormat(locale, {
        currency,
        style: "currency",
        minimumFractionDigits: 0,
    });

    return asLocaleString ? formatter.format(rawAmount) : formattedAmount;
}

export function getUnit(currency?: string): number {
    if (!currency) currency = getDefaultCurrency();

    const currencyData = currencySymbols[currency];
    if (!currencyData) return 0;

    const { decimals } = currencyData;

    return Math.pow(10, decimals);
}

/**
 * Extracts the currency symbol from a locale and currency code.
 * Uses Intl.NumberFormat to derive the symbol, falling back to the currency code if extraction fails.
 *
 * @param locale - The locale string (e.g., "es", "en")
 * @param currency - The ISO 4217 currency code (e.g., "EUR", "USD")
 * @returns The currency symbol (e.g., "€", "$") or the currency code as fallback
 */
export function getCurrencySymbol(locale: string, currency: string): string {
    try {
        const parts = new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).formatToParts(0);
        const currencyPart = parts.find((part) => part.type === "currency");
        return currencyPart?.value ?? currency;
    } catch (error) {
        console.warn("Failed to derive currency symbol", error);
        return currency;
    }
}

/**
 * Formats an amount with its currency symbol using locale-aware formatting.
 * This is a convenience wrapper around formatCurrency that accepts a locale parameter.
 * Handles unit conversion (e.g., cents to dollars) and decimal precision automatically.
 *
 * @param amount - The amount in the smallest currency unit (e.g., cents for EUR/USD)
 * @param currency - The ISO 4217 currency code (defaults to "EUR")
 * @param locale - The locale for number formatting (e.g., "es", "en")
 * @returns Formatted string with amount and symbol (e.g., "1.234,56 €" for es-ES)
 */
export function formatAmountWithSymbol(
    amount: number | undefined,
    currency: string | null | undefined,
    locale: string,
): string {
    // Simply delegate to formatCurrency with the locale parameter
    return formatCurrency(amount, currency, { asLocaleString: true, locale });
}

export const DEFAULT_CURRENCY = getDefaultCurrency();
