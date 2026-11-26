import { apiCategoriesGetCollection, apiThemesGetCollection } from "../openapi/client";
import { toCollectionItems } from "../utils/hydra";

import type { Category, Theme } from "../openapi/client";

export interface Taxonomy {
    categories: Category[];
    themes: Theme[];
}

/**
 * Categories and themes are managed in the API and shared by projects and blog posts.
 * @param langs The accepted languages, so names come translated when available
 * @returns Both collections
 */
export async function getTaxonomy(langs: string[]): Promise<Taxonomy> {
    const [{ data: categories }, { data: themes }] = await Promise.all([
        apiCategoriesGetCollection({ headers: { "Accept-Language": langs } }),
        apiThemesGetCollection({ headers: { "Accept-Language": langs } }),
    ]);

    return {
        categories: toCollectionItems<Category>(categories),
        themes: toCollectionItems<Theme>(themes),
    };
}

/**
 * Resolve the names of the API identifiers a blog post is linked to.
 * @param items Categories or themes
 * @param ids The identifiers to resolve, in order
 * @returns The names that exist, skipping identifiers that no longer do
 */
export function namesForIds(items: Array<Category | Theme>, ids: string[]): string[] {
    const byId = new Map(items.map((item) => [item.id ?? "", item.name]));

    return ids.map((id) => byId.get(id)).filter((name): name is string => typeof name === "string");
}
