import { normalizeForMatch } from "./highlights";

/**
 * Common shape every resource is converted into before it reaches the UI.
 * This is the I/O layer that lets a single search component serve any resource.
 */
export interface SearchResultItem<T = unknown> {
    /** Stable option id, used for selection and de-duplication. */
    id: string;
    /** What the caller stores once the item is picked: an IRI, slug, handle, ISO code... */
    value: string;
    /** Text shown in the results list. May contain HTML. */
    label: string;
    /** Optional section heading; results sharing a group are rendered together. */
    group?: string;
    /** Optional secondary line (e.g. "@handle"). */
    detail?: string;
    /** The original entity, for callers that need more than `value` (e.g. territories). */
    raw?: T;
}

export type ResourceSearcher<T = unknown> = (
    query: string,
    signal?: AbortSignal,
) => Promise<SearchResultItem<T>[]>;

export const DEFAULT_MIN_CHARS = 2;

interface RemoteSearcherOptions<E, T> {
    /** Hits the API with the trimmed query. */
    fetch: (query: string, signal?: AbortSignal) => Promise<E[]>;
    map: (entity: E) => SearchResultItem<T>;
    /** Below this many characters the searcher resolves empty without fetching. */
    minChars?: number;
    group?: string;
}

/**
 * Builds a searcher that queries the API on every call.
 */
export function createSearcher<E, T = E>({
    fetch,
    map,
    minChars = DEFAULT_MIN_CHARS,
    group,
}: RemoteSearcherOptions<E, T>): ResourceSearcher<T> {
    return async (query, signal) => {
        const trimmed = query.trim();
        if (trimmed.length < minChars) return [];

        const entities = await fetch(trimmed, signal);

        return entities.map((entity) => withGroup(map(entity), group));
    };
}

interface LocalSearcherOptions<E, T> {
    /** Fetches the whole collection. Called once; the promise is reused afterwards. */
    fetchAll: (signal?: AbortSignal) => Promise<E[]>;
    map: (entity: E) => SearchResultItem<T>;
    group?: string;
}

/**
 * Builds a searcher for small collections the API cannot filter server-side
 * (gateways, categories): fetch the collection once, then filter in the browser.
 */
export function createLocalSearcher<E, T = E>({
    fetchAll,
    map,
    group,
}: LocalSearcherOptions<E, T>): ResourceSearcher<T> {
    let cached: Promise<E[]> | undefined;

    return async (query, signal) => {
        if (!cached) {
            cached = fetchAll(signal).catch((error) => {
                // Do not cache a failure: the next keystroke should retry.
                cached = undefined;
                throw error;
            });
        }

        const entities = await cached;
        const normalized = normalizeForMatch(query.trim());

        return entities
            .map((entity) => withGroup(map(entity), group))
            .filter((item) => !normalized || normalizeForMatch(item.label).includes(normalized));
    };
}

/**
 * Runs several searchers in parallel and concatenates their results, keeping
 * each item's own `group` so the UI can render one section per resource.
 */
export function combineSearchers<T = unknown>(
    ...searchers: ResourceSearcher<T>[]
): ResourceSearcher<T> {
    return async (query, signal) => {
        const results = await Promise.all(searchers.map((searcher) => searcher(query, signal)));

        return results.flat();
    };
}

/** Groups items in encounter order; ungrouped items land under `""`. */
export function groupResults<T>(items: SearchResultItem<T>[]): [string, SearchResultItem<T>[]][] {
    const groups = new Map<string, SearchResultItem<T>[]>();

    for (const item of items) {
        const key = item.group ?? "";
        const bucket = groups.get(key);
        if (bucket) {
            bucket.push(item);
        } else {
            groups.set(key, [item]);
        }
    }

    return [...groups];
}

function withGroup<T>(item: SearchResultItem<T>, group?: string): SearchResultItem<T> {
    return group ? { ...item, group } : item;
}
