import type { ApiProjectsGetCollectionData } from "../openapi/client/types.gen";

export type SearchFilters = NonNullable<ApiProjectsGetCollectionData["query"]>;

export function parseSearchParamsFilters(searchParams: URLSearchParams): SearchFilters {
    const filters: Record<string, string | string[]> = {};

    for (const key of new Set(searchParams.keys())) {
        const values = searchParams.getAll(key);
        filters[key] = values.length > 1 || key.endsWith("[]") ? values : values[0];
    }

    return filters as SearchFilters;
}

export function toSearchParams(filters: SearchFilters): URLSearchParams {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(filters)) {
        if (value == null || value === "") continue;

        if (Array.isArray(value)) {
            value.forEach((item) => params.append(key, String(item)));
        } else {
            params.set(key, String(value));
        }
    }

    return params;
}
