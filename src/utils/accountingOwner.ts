import { extractId } from "./extractId";
import {
    apiAccountingsIdGet,
    apiProjectsIdOrSlugGet,
    apiTipjarsIdGet,
    apiUsersIdOrHandleGet,
} from "../openapi/client/index.ts";
import {
    apiProjectsGetCollectionUrl,
    apiTipjarsGetCollectionUrl,
    apiUsersGetCollectionUrl,
} from "../openapi/client/operation-paths.gen";

export type OwnerKind = "user" | "project" | "tipjar";

export type OwnerRef = {
    kind: OwnerKind;
    name: string;
};

const ownerDisplayKey: Record<OwnerKind, string> = {
    user: "displayName",
    project: "title",
    tipjar: "name",
};

const prefixToKind = new Map<string, OwnerKind>([
    [apiUsersGetCollectionUrl, "user"],
    [apiProjectsGetCollectionUrl, "project"],
    [apiTipjarsGetCollectionUrl, "tipjar"],
]);

const cache = new Map<string, Promise<OwnerRef | undefined>>();

function iriPrefix(iri: string): string {
    const idx = iri.lastIndexOf("/");
    return idx > 0 ? iri.substring(0, idx) : iri;
}

export function resolveAccountingOwner(accountingIri: string): Promise<OwnerRef | undefined> {
    const existing = cache.get(accountingIri);
    if (existing) return existing;

    const p = (async (): Promise<OwnerRef | undefined> => {
        const id = extractId(accountingIri);
        if (!id) return undefined;

        const { data: accounting } = await apiAccountingsIdGet({
            baseUrl: "/api/relay",
            path: { id },
        });
        if (!accounting?.owner) return undefined;

        const ownerIri = accounting.owner;
        const kind = prefixToKind.get(iriPrefix(ownerIri));
        if (!kind) return undefined;

        const ownerId = extractId(ownerIri);
        if (!ownerId) return undefined;

        let owner: Record<string, unknown> | undefined;
        if (kind === "user") {
            const res = await apiUsersIdOrHandleGet({
                baseUrl: "/api/relay",
                path: { idOrHandle: ownerId },
            });
            owner = res.data as Record<string, unknown> | undefined;
        } else if (kind === "project") {
            const res = await apiProjectsIdOrSlugGet({
                baseUrl: "/api/relay",
                path: { idOrSlug: ownerId },
            });
            owner = res.data as Record<string, unknown> | undefined;
        } else {
            const res = await apiTipjarsIdGet({ baseUrl: "/api/relay", path: { id: ownerId } });
            owner = res.data as Record<string, unknown> | undefined;
        }
        if (!owner) return undefined;

        return {
            kind,
            name: owner[ownerDisplayKey[kind]] as string,
        };
    })();

    cache.set(accountingIri, p);
    return p;
}

export function clearAccountingOwnerCache(): void {
    cache.clear();
}
