export function toCollectionItems<T>(collection: unknown): T[] {
    if (Array.isArray(collection)) {
        return collection as T[];
    }

    if (collection && typeof collection === "object") {
        const record = collection as Record<string, unknown>;
        const hydraMembers = record["hydra:member"];
        const members = record.member;

        if (Array.isArray(hydraMembers)) {
            return hydraMembers as T[];
        }

        if (Array.isArray(members)) {
            return members as T[];
        }
    }

    return [];
}

export function getCollectionTotalItems(collection: unknown): number {
    if (collection && typeof collection === "object" && !Array.isArray(collection)) {
        const record = collection as Record<string, unknown>;
        const totalItems = record.totalItems ?? record["hydra:totalItems"];

        if (typeof totalItems === "number") {
            return totalItems;
        }
    }

    return toCollectionItems(collection).length;
}
