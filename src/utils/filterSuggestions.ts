import { withoutCache } from "../openapi/cacheInterceptor";
import {
    apiGatewaysGetCollection,
    apiProjectsGetCollection,
    apiTipjarsGetCollection,
    apiUsersGetCollection,
    apiCategoriesGetCollection,
} from "../openapi/client";
import {
    apiProjectsIdOrSlugGetUrl,
    apiUsersIdOrHandleGetUrl,
} from "../openapi/client/operation-paths.gen";

import type { FilterOption } from "./filterComposer";

type CollectionResponse<T> = { totalItems: number; member: T[] };

export async function suggestGateways(q: string): Promise<FilterOption[]> {
    const { data } = await withoutCache(() =>
        apiGatewaysGetCollection({
            headers: { Accept: "application/ld+json" },
            baseUrl: "/api/relay",
        }),
    );

    if (!data) return [];

    const gateways = (data as unknown as CollectionResponse<Record<string, unknown>>).member ?? [];
    return gateways
        .filter((g) => !q || ((g.name as string) ?? "").toLowerCase().includes(q.toLowerCase()))
        .map((g) => ({
            value: g.id as string,
            label: g.name as string,
        }));
}

export async function suggestAccounting(q: string): Promise<FilterOption[]> {
    const trimmed = q.trim();
    if (trimmed.length < 2) return [];

    const [tipjars, users, projects] = await Promise.all([
        apiTipjarsGetCollection({ query: { name: trimmed, itemsPerPage: 1 } }),
        apiUsersGetCollection({ query: { q: trimmed, itemsPerPage: 5 } }),
        apiProjectsGetCollection({ query: { title: trimmed, itemsPerPage: 4 } }),
    ]);

    const options: FilterOption[] = [];

    for (const t of tipjars.data ?? []) {
        options.push({
            value: t.accounting!,
            label: `<strong>${t.name}</strong> (tipjar)`,
        });
    }

    for (const u of users.data ?? []) {
        options.push({
            value: u.accounting!,
            label: `<strong>${u.handle}</strong> (user: ${u.email})`,
        });
    }

    for (const p of projects.data ?? []) {
        options.push({
            value: p.accounting!,
            label: `<strong>${p.slug}</strong> (project: ${p.title})`,
        });
    }

    return options;
}

export async function suggestOwner(q: string): Promise<FilterOption[]> {
    const trimmed = q.trim();
    if (trimmed.length < 2) return [];

    const { data } = await apiUsersGetCollection({ query: { handle: trimmed } });
    if (!data) return [];

    return data.map((u) => ({
        value: u.handle ?? "",
        label: u.handle ?? "",
    }));
}

export async function suggestCategories(q: string): Promise<FilterOption[]> {
    const { data } = await apiCategoriesGetCollection();
    if (!data) return [];

    return data
        .filter((c) => !q || c.name?.toLowerCase().includes(q.toLowerCase()))
        .map((c) => ({ value: c.id ?? "", label: c.name ?? "" }));
}

export async function suggestProjects(q: string): Promise<FilterOption[]> {
    const trimmed = q.trim();
    if (trimmed.length < 2) return [];

    const { data } = await apiProjectsGetCollection({ query: { title: trimmed } });
    if (!data) return [];

    return data.map((p) => ({
        value: p.title ?? "",
        label: p.title ?? p.slug ?? "",
    }));
}

export async function suggestProjectsBySubtitle(q: string): Promise<FilterOption[]> {
    const trimmed = q.trim();
    if (trimmed.length < 2) return [];

    const { data } = await apiProjectsGetCollection({ query: { subtitle: trimmed } });
    if (!data) return [];

    return data.map((p) => ({
        value: p.subtitle ?? "",
        label: p.title ?? p.slug ?? "",
    }));
}

export async function suggestProjectsByDescription(q: string): Promise<FilterOption[]> {
    const trimmed = q.trim();
    if (trimmed.length < 2) return [];

    const { data } = await apiProjectsGetCollection({ query: { descBrief: trimmed } });
    if (!data) return [];

    return data.map((p) => ({
        value: p.descBrief ?? "",
        label: p.title ?? p.slug ?? "",
    }));
}

export async function suggestProjectsBySlug(q: string): Promise<FilterOption[]> {
    const trimmed = q.trim();
    if (trimmed.length < 2) return [];

    const { data } = await apiProjectsGetCollection({ query: { slug: trimmed } });
    if (!data) return [];

    return data.map((p) => ({
        value: p.slug ?? "",
        label: p.title ?? p.slug ?? "",
    }));
}

export async function suggestUserHandle(q: string): Promise<FilterOption[]> {
    const trimmed = q.trim();
    if (trimmed.length < 2) return [];

    const { data } = await apiUsersGetCollection({ query: { handle: trimmed } });
    if (!data) return [];

    return data.map((u) => ({
        value: u.handle ?? "",
        label: u.handle ?? "",
    }));
}

export async function suggestUserEmail(q: string): Promise<FilterOption[]> {
    const trimmed = q.trim();
    if (trimmed.length < 2) return [];

    const { data } = await apiUsersGetCollection({ query: { email: trimmed } });
    if (!data) return [];

    return data.map((u) => ({
        value: u.email ?? "",
        label: u.email ?? "",
    }));
}

/** Suggests project IRIs, the values the `project[]` filter of ProjectReviews expects. */
export async function suggestProjectIris(q: string): Promise<FilterOption[]> {
    const trimmed = q.trim();
    if (trimmed.length < 2) return [];

    const { data } = await apiProjectsGetCollection({ query: { title: trimmed } });
    if (!data) return [];

    return data.map((p) => ({
        value: apiProjectsIdOrSlugGetUrl.replace("{idOrSlug}", String(p.id)),
        label: p.title ?? p.slug ?? "",
    }));
}

/** Suggests user IRIs, the values the `reviewer[]` filter of ProjectReviews expects. */
export async function suggestReviewerIris(q: string): Promise<FilterOption[]> {
    const trimmed = q.trim();
    if (trimmed.length < 2) return [];

    const { data } = await apiUsersGetCollection({ query: { q: trimmed, itemsPerPage: 5 } });
    if (!data) return [];

    return data.map((u) => ({
        value: apiUsersIdOrHandleGetUrl.replace("{idOrHandle}", String(u.id)),
        label: u.displayName ?? u.handle ?? "",
    }));
}

export async function suggestCountry(q: string): Promise<FilterOption[]> {
    const currentLocaleStr = typeof window !== "undefined" ? navigator.language : "es";
    const names = new Intl.DisplayNames([currentLocaleStr], { type: "region" });

    const codes = [
        "ES",
        "FR",
        "DE",
        "IT",
        "PT",
        "GB",
        "US",
        "MX",
        "AR",
        "CO",
        "CL",
        "PE",
        "BR",
        "NL",
        "BE",
        "CH",
        "AT",
        "SE",
        "NO",
        "DK",
        "FI",
        "IE",
        "PL",
        "CZ",
        "HU",
        "RO",
        "GR",
        "TR",
        "JP",
        "CN",
        "IN",
        "AU",
        "CA",
        "ZA",
        "EG",
        "NG",
        "KE",
        "MA",
        "TN",
        "DZ",
    ];

    const lower = q.toLowerCase();
    return codes
        .filter((code) => {
            if (!q) return true;
            const name = names.of(code) ?? "";
            return name.toLowerCase().includes(lower) || code.toLowerCase().includes(lower);
        })
        .map((code) => ({
            value: code,
            label: `${names.of(code) ?? code} (${code})`,
        }));
}
