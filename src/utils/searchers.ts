import { toCollectionItems } from "./hydra";
import { combineSearchers, createLocalSearcher, createSearcher } from "./resourceSearch";
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
            const { data } = await apiUsersGetCollection({ query: { [field]: query }, signal });
            return toCollectionItems<User>(data);
        },
        map: (user) => ({
            id: String(user.id ?? user.handle ?? ""),
            value: user[field] ?? "",
            label: user[field] ?? "",
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

    if (resources.includes("projects")) {
        searchers.push(
            createSearcher<Project, Project>({
                group: SEARCH_GROUPS.projects,
                fetch: async (query, signal) => {
                    const { data } = await apiProjectsGetCollection({
                        query: { title: query, itemsPerPage: itemsPerPage.projects },
                        baseUrl,
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
                        baseUrl,
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
                        baseUrl,
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
    itemsPerPage: { projects: 4, tipjars: 1, users: 5 },
});

/**
 * Places, via the external Nominatim geocoder. `raw` carries the Nominatim
 * result so callers can fold it into a `Territory` with `toTerritories`.
 */
export const searchTerritories: ResourceSearcher<NominatimResult> = createSearcher<
    NominatimResult,
    NominatimResult
>({
    fetch: (query, signal) => searchPlace(query, 6, false, signal),
    map: (result) => ({
        id: String(result.osm_id),
        value: result.display_name,
        label: result.display_name,
        raw: result,
    }),
});

export interface Territories {
    countries: string[];
    subLvl1: string[];
    subLvl2: string[];
}

/**
 * Folds picked places into the API's territory filter shape, keeping only the
 * most specific administrative level each place resolves to.
 */
export function toTerritories(items: SearchResultItem<NominatimResult>[]): Territories {
    const countries = new Set<string>();
    const subLvl1 = new Set<string>();
    const subLvl2 = new Set<string>();

    for (const item of items) {
        if (!item.raw) continue;
        const { country, subLvl1: lvl1, subLvl2: lvl2 } = extractTerritory(item.raw);

        if (lvl2) {
            subLvl2.add(lvl2);
        } else if (lvl1) {
            subLvl1.add(lvl1);
        } else if (country) {
            countries.add(country);
        }
    }

    return { countries: [...countries], subLvl1: [...subLvl1], subLvl2: [...subLvl2] };
}
