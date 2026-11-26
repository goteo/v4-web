import { toCollectionItems } from "./hydra";
import {
    DEFAULT_MIN_CHARS,
    combineSearchers,
    createLocalSearcher,
    createSearcher,
} from "./resourceSearch";
import { withoutCache } from "../openapi/cacheInterceptor";
import {
    apiCategoriesGetCollection,
    apiGatewaysGetCollection,
    apiProjectsGetCollection,
    apiTipjarsGetCollection,
    apiUsersGetCollection,
} from "../openapi/client";
import { extractTerritory, searchPlace, type NominatimResult } from "../services/nominatim";

import type { ResourceSearcher, SearchResultItem } from "./resourceSearch";
import type { Category, Gateway, Project, Tipjar, User } from "../openapi/client";

/** i18n keys used as section headings when several resources are searched at once. */
export const SEARCH_GROUPS = {
    projects: "domain.charges.entityLabels.projects",
    tipjars: "domain.charges.entityLabels.tipjars",
    users: "domain.charges.entityLabels.users",
} as const;

/**
 * Projects, searched by one of their text fields. The picked `value` is that
 * same field, which is what the filter composer sends back to the API.
 */
function projectsBy(field: "title" | "subtitle" | "descBrief" | "slug"): ResourceSearcher<Project> {
    return createSearcher<Project, Project>({
        fetch: async (query, signal) => {
            const { data } = await apiProjectsGetCollection({ query: { [field]: query }, signal });
            return toCollectionItems<Project>(data);
        },
        map: (project) => ({
            id: String(project.id ?? project.slug ?? ""),
            value: project[field] ?? "",
            label: project.title ?? project.slug ?? "",
            raw: project,
        }),
    });
}

export const searchProjectsByTitle = projectsBy("title");
export const searchProjectsBySubtitle = projectsBy("subtitle");
export const searchProjectsByDescription = projectsBy("descBrief");
export const searchProjectsBySlug = projectsBy("slug");

/** Users, searched by one of their identifying fields. */
function usersBy(field: "handle" | "email"): ResourceSearcher<User> {
    return createSearcher<User, User>({
        fetch: async (query, signal) => {
            const { data } = await apiUsersGetCollection({
                baseUrl: "/api/relay",
                query: { q: query },
                signal,
            });
            return toCollectionItems<User>(data);
        },
        map: (user) => ({
            id: String(user.id ?? user.handle ?? ""),
            value: user[field] ?? "",
            label: user[field] ?? "",
            detail: user.displayName ?? undefined,
            raw: user,
        }),
    });
}

export const searchUsersByHandle = usersBy("handle");
export const searchUsersByEmail = usersBy("email");

/** Categories: the collection is small and the API cannot do partial matching. */
export const searchCategories = createLocalSearcher<Category, Category>({
    fetchAll: async (signal) => {
        const { data } = await apiCategoriesGetCollection({ signal });
        return toCollectionItems<Category>(data);
    },
    map: (category) => ({
        id: String(category.id ?? ""),
        value: String(category.id ?? ""),
        label: category.name ?? "",
        raw: category,
    }),
});

/** Gateways: served through the relay, uncached, and filtered client-side. */
export const searchGateways = createLocalSearcher<Gateway, Gateway>({
    fetchAll: async () => {
        const { data } = await withoutCache(() =>
            apiGatewaysGetCollection({
                headers: { Accept: "application/ld+json" },
                baseUrl: "/api/relay",
            }),
        );
        return toCollectionItems<Gateway>(data);
    },
    map: (gateway) => ({
        id: gateway.id ?? "",
        value: gateway.id ?? "",
        label: gateway.name ?? "",
        raw: gateway,
    }),
});

interface AccountingSearcherOptions {
    /** Set to "/api/relay" to go through the server-side auth proxy. */
    baseUrl?: string;
    /** Which resources to search. Defaults to all three. */
    resources?: ("projects" | "tipjars" | "users")[];
    itemsPerPage?: Partial<Record<"projects" | "tipjars" | "users", number>>;
}

/**
 * Anything that owns an accounting: projects, tipjars and users. The picked
 * `value` is the accounting IRI; `raw` keeps the entity for callers that need it.
 */
export function createAccountingSearcher({
    baseUrl,
    resources = ["projects", "tipjars", "users"],
    itemsPerPage = {},
}: AccountingSearcherOptions = {}): ResourceSearcher {
    const searchers: ResourceSearcher[] = [];

    // The SDK spreads caller options over its config, so an explicit
    // `baseUrl: undefined` would clobber the default and yield a relative
    // `/v4/...` URL. Only forward it when the caller actually set one.
    const baseUrlOption = baseUrl ? { baseUrl } : {};

    if (resources.includes("projects")) {
        searchers.push(
            createSearcher<Project, Project>({
                group: SEARCH_GROUPS.projects,
                fetch: async (query, signal) => {
                    const { data } = await apiProjectsGetCollection({
                        query: { title: query, itemsPerPage: itemsPerPage.projects },
                        ...baseUrlOption,
                        signal,
                    });
                    return toCollectionItems<Project>(data).filter((p) => p.accounting);
                },
                map: (project) => ({
                    id: `project-${project.id ?? project.slug}`,
                    value: project.accounting ?? "",
                    label: project.title ?? project.slug ?? "",
                    detail: project.subtitle,
                    raw: project,
                }),
            }) as ResourceSearcher,
        );
    }

    if (resources.includes("tipjars")) {
        searchers.push(
            createSearcher<Tipjar, Tipjar>({
                group: SEARCH_GROUPS.tipjars,
                fetch: async (query, signal) => {
                    const { data } = await apiTipjarsGetCollection({
                        query: { name: query, itemsPerPage: itemsPerPage.tipjars },
                        ...baseUrlOption,
                        signal,
                    });
                    return toCollectionItems<Tipjar>(data).filter((tipjar) => tipjar.accounting);
                },
                map: (tipjar) => ({
                    id: `tipjar-${tipjar.id}`,
                    value: tipjar.accounting ?? "",
                    label: tipjar.name ?? "",
                    detail: String(tipjar.id ?? ""),
                    raw: tipjar,
                }),
            }) as ResourceSearcher,
        );
    }

    if (resources.includes("users")) {
        searchers.push(
            createSearcher<User, User>({
                group: SEARCH_GROUPS.users,
                fetch: async (query, signal) => {
                    const { data } = await apiUsersGetCollection({
                        query: { q: query, itemsPerPage: itemsPerPage.users },
                        ...baseUrlOption,
                        signal,
                    });
                    return toCollectionItems<User>(data).filter((user) => user.accounting);
                },
                map: (user) => ({
                    id: `user-${user.id ?? user.handle}`,
                    value: user.accounting ?? "",
                    label: user.displayName ?? user.handle ?? "",
                    detail: `@${user.handle}`,
                    raw: user,
                }),
            }) as ResourceSearcher,
        );
    }

    return combineSearchers(...searchers);
}

/** The filter composer's "target"/"origin" subjects. */
export const searchAccountings = createAccountingSearcher({
    baseUrl: "/api/relay",
    itemsPerPage: { projects: 4, tipjars: 1, users: 5 },
});

function territoryLabel(
    result: NominatimResult,
    territory: { country?: string | null; subLvl1?: string | null; subLvl2?: string | null },
): string {
    const addr = result.address ?? {};
    const id = territory.subLvl2 ?? territory.subLvl1 ?? territory.country ?? "";

    if (territory.subLvl2) {
        return String(
            addr.county ??
                addr.municipality ??
                addr.city_district ??
                addr.district ??
                addr.province ??
                addr.state_district ??
                id,
        );
    }

    if (territory.subLvl1) {
        return String(addr.state ?? addr.region ?? addr.province ?? id);
    }

    return String(addr.country ?? id);
}

function normalizeTerritorySelection(
    territory: { country?: string | null; subLvl1?: string | null; subLvl2?: string | null },
    id: string,
): { country: string | null; subLvl1: string | null; subLvl2: string | null } {
    const country = territory.country ?? null;
    const subLvl1 = territory.subLvl1 ?? null;
    const subLvl2 = territory.subLvl2 ?? null;

    if (id === country) {
        return { country, subLvl1: null, subLvl2: null };
    }

    if (id === subLvl1) {
        return { country, subLvl1, subLvl2: null };
    }

    return { country, subLvl1, subLvl2 };
}

/**
 * Territories, via the external Nominatim geocoder. Places are collapsed into
 * one selectable territory option (preferring region level when available) so
 * different places in the same territory resolve to the same choice. `raw` keeps
 * a Nominatim result for callers that need place details.
 */
export const searchTerritories: ResourceSearcher<NominatimResult> = async (query, signal) => {
    const trimmed = query.trim();
    if (trimmed.length < DEFAULT_MIN_CHARS) return [];

    const places = await searchPlace(trimmed, 6, false, signal);
    const byId = new Map<string, SearchResultItem<NominatimResult>>();

    for (const place of places) {
        if (signal?.aborted) return [];

        const extracted = extractTerritory(place);
        const selected = normalizeTerritorySelection(
            extracted,
            extracted.subLvl1 ?? extracted.country ?? "",
        );
        const id = selected.subLvl1 ?? selected.country;
        if (!id || byId.has(id)) continue;

        byId.set(id, {
            id,
            value: id,
            label: territoryLabel(place, selected),
            raw: place,
        });
    }

    return [...byId.values()];
};

export function territoryFromSearchItem(item: SearchResultItem<NominatimResult>) {
    if (!item.raw) {
        return { country: null, subLvl1: null, subLvl2: null, address: null };
    }

    const extracted = extractTerritory(item.raw);
    const selected = normalizeTerritorySelection(extracted, item.id || item.value);

    return { ...selected, address: item.raw.display_name ?? null };
}

export interface Territories {
    countries: string[];
    subLvl1: string[];
    subLvl2: string[];
}

/**
 * Folds picked territories into the API's territory filter shape, honoring the
 * territory level represented by each selected item.
 */
export function toTerritories(items: SearchResultItem<NominatimResult>[]): Territories {
    const countries = new Set<string>();
    const subLvl1 = new Set<string>();
    const subLvl2 = new Set<string>();

    for (const item of items) {
        const territory = item.raw ? territoryFromSearchItem(item) : null;
        if (!territory) continue;

        if (territory.subLvl2) {
            subLvl2.add(territory.subLvl2);
        } else if (territory.subLvl1) {
            subLvl1.add(territory.subLvl1);
        } else if (territory.country) {
            countries.add(territory.country);
        }
    }

    return { countries: [...countries], subLvl1: [...subLvl1], subLvl2: [...subLvl2] };
}
