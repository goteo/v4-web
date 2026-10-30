import { extractId } from "./extractId";
import {
    apiProjectsIdOrSlugGet,
    apiUsersIdOrHandleGet,
    type Project,
    type User,
} from "../openapi/client/index.ts";

/**
 * Resolves IRIs into the resources they point at, caching the outcome of every
 * request so a page can hydrate its rows in the background without hammering the
 * API. The pattern mirrors {@link resolveAccountingOwner}: callers can fire these
 * without awaiting and render a placeholder until they settle.
 */

const projectCache = new Map<string, Promise<Project | undefined>>();
const userCache = new Map<string, Promise<User | undefined>>();

export function resolveProject(iri: string): Promise<Project | undefined> {
    const existing = projectCache.get(iri);
    if (existing) return existing;

    const pending = (async (): Promise<Project | undefined> => {
        const idOrSlug = extractId(iri);
        if (!idOrSlug) return undefined;

        const { data } = await apiProjectsIdOrSlugGet({
            baseUrl: "/api/relay",
            path: { idOrSlug },
        });

        return data;
    })();

    projectCache.set(iri, pending);
    return pending;
}

export function resolveUser(iri: string): Promise<User | undefined> {
    const existing = userCache.get(iri);
    if (existing) return existing;

    const pending = (async (): Promise<User | undefined> => {
        const idOrHandle = extractId(iri);
        if (!idOrHandle) return undefined;

        const { data } = await apiUsersIdOrHandleGet({
            baseUrl: "/api/relay",
            path: { idOrHandle },
        });

        return data;
    })();

    userCache.set(iri, pending);
    return pending;
}

/** Drops a cached project so the next `resolveProject` reads it again from the API. */
export function invalidateProject(iri: string): void {
    projectCache.delete(iri);
}
