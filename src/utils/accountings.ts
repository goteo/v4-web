/**
 * Practical rule of thumb:
 * use `fetchAccountingsByIds` when you already have a list of ids and want the data in bulk,
 * and `fetchAccounting` when you resolve one accounting at a time from UI code but want the
 * calls fired in the same tick to travel together.
 */
import { getBaseUrl } from "./consts";
import { extractId } from "./extractId";
import { toCollectionItems } from "./hydra";
import { apiAccountingsGetCollection } from "../openapi/client";

import type { Accounting } from "../openapi/client/types.gen";

/**
 * Maximum number of accountings the API returns in a single page (`itemsPerPage` max is 100),
 * so a batch never asks for more ids than a page can hold.
 */
const MAX_IDS_PER_REQUEST = 100;

export type AccountingsHeaders = HeadersInit | Record<string, unknown>;

export type AccountingsRequestOptions = {
    /**
     * Base URL of the API. The browser must go through the relay (`/api/relay`) so the bearer
     * token never leaves the server; on the server the API URL is used directly.
     */
    baseUrl?: string;
    headers?: AccountingsHeaders;
};

/**
 * Diagnostic detail of a request that could not load every accounting it asked for.
 *
 * The accountings that could be loaded are still returned: this only describes the ones that
 * failed, so a broken id is visible without having to reproduce the request by hand.
 */
export type AccountingsFetchFailure = {
    /** Every id the request asked for. */
    requestedIds: string[];
    /** Ids that could not be loaded, i.e. the ones that made the API fail. */
    failedIds: string[];
    /** Errors reported while fetching the failed ids, one per failed request. */
    errors: unknown[];
};

/** Diagnostic detail of a coalesced group that could not load every accounting it asked for. */
export type AccountingsBatchFailure = AccountingsFetchFailure & {
    /** Key that grouped the coalesced requests (base URL and headers). */
    groupKey: string;
    /** Base URL the group was requested from. */
    baseUrl: string;
};

type ChunkFailure = {
    ids: number[];
    error: unknown;
};

/**
 * Turns a list of accounting identifiers into the unique integers the `id[]` filter expects.
 * Identifiers arrive as IRI fragments (`extractId` returns a string) or as plain numbers.
 * Anything that is not a positive integer is dropped.
 */
function normalizeIds(ids: ReadonlyArray<string | number | null | undefined>): number[] {
    const normalized = new Set<number>();

    for (const id of ids) {
        if (id === null || id === undefined || id === "") continue;

        const value = typeof id === "number" ? id : Number(id);
        if (!Number.isInteger(value) || value <= 0) continue;

        normalized.add(value);
    }

    return [...normalized];
}

/**
 * Fetches one page of accountings.
 *
 * The API answers with a 500 when any of the requested accountings is broken (for instance, when
 * it has no owner), which would discard the whole page. A failed page is therefore split in
 * halves and retried until the broken ones are isolated, so the healthy ones still come back and
 * the failing ids can be reported one by one.
 */
async function fetchChunk(
    chunk: number[],
    options: { baseUrl: string; headers?: AccountingsHeaders },
): Promise<{ accountings: Accounting[]; failures: ChunkFailure[] }> {
    try {
        const { data, error } = await apiAccountingsGetCollection({
            baseUrl: options.baseUrl,
            query: {
                "id[]": chunk,
                itemsPerPage: chunk.length,
            },
            headers: options.headers,
        });

        if (error) throw error;

        return { accountings: toCollectionItems<Accounting>(data), failures: [] };
    } catch (error) {
        if (chunk.length === 1) {
            console.warn("Failed to fetch accounting", { id: chunk[0], error });
            return { accountings: [], failures: [{ ids: chunk, error }] };
        }

        const middle = Math.ceil(chunk.length / 2);
        const [left, right] = await Promise.all([
            fetchChunk(chunk.slice(0, middle), options),
            fetchChunk(chunk.slice(middle), options),
        ]);

        return {
            accountings: [...left.accountings, ...right.accountings],
            failures: [...left.failures, ...right.failures],
        };
    }
}

/**
 * Loads several accountings and reports, separately, the ones that could not be fetched.
 *
 * The API accepts up to 100 ids per page, so longer lists are split into as many requests as
 * needed. A failing page does not break the others.
 */
async function loadAccountings(
    ids: ReadonlyArray<string | number | null | undefined>,
    options: AccountingsRequestOptions,
): Promise<{ accountings: Map<string, Accounting>; failure?: AccountingsFetchFailure }> {
    const numericIds = normalizeIds(ids);
    const accountings = new Map<string, Accounting>();
    const failures: ChunkFailure[] = [];

    if (numericIds.length === 0) return { accountings };

    const baseUrl = options.baseUrl ?? getBaseUrl();

    for (let index = 0; index < numericIds.length; index += MAX_IDS_PER_REQUEST) {
        const chunk = numericIds.slice(index, index + MAX_IDS_PER_REQUEST);
        const result = await fetchChunk(chunk, { baseUrl, headers: options.headers });

        for (const accounting of result.accountings) {
            if (accounting.id === undefined) continue;
            accountings.set(String(accounting.id), accounting);
        }

        failures.push(...result.failures);
    }

    if (failures.length === 0) return { accountings };

    return {
        accountings,
        failure: {
            requestedIds: numericIds.map(String),
            failedIds: failures.flatMap((failure) => failure.ids.map(String)),
            errors: failures.map((failure) => failure.error),
        },
    };
}

/**
 * Fetches several accountings at once through the `id[]` filter of the accountings collection.
 *
 * The API accepts up to 100 ids per page, so longer lists are split into as many requests as
 * needed. A failing page does not break the others: the accountings it should have returned are
 * simply missing from the result, and the failure is logged with the ids that caused it.
 *
 * @param ids Accounting ids, as numbers or as the numeric fragment of an accounting IRI
 * @param options Base URL and headers for the request
 * @returns The accountings found, keyed by their id
 */
export async function fetchAccountingsByIds(
    ids: ReadonlyArray<string | number | null | undefined>,
    options: AccountingsRequestOptions = {},
): Promise<Map<string, Accounting>> {
    const { accountings, failure } = await loadAccountings(ids, options);

    if (failure) console.warn("Some accountings could not be loaded", failure);

    return accountings;
}

type PendingRequest = {
    iri: string;
    resolve: (accounting: Accounting | undefined) => void;
};

type RequestGroup = {
    options: AccountingsRequestOptions;
    pending: PendingRequest[];
};

/**
 * Requests waiting for the next flush, grouped by the options they were made with: only
 * requests sharing the same base URL and headers can travel in the same call.
 */
const pendingGroups = new Map<string, RequestGroup>();

let flushTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Flattens the headers into a stable list, so requests made with the same headers share the
 * same group key regardless of the order they were written in.
 */
function normalizeHeaders(headers?: AccountingsHeaders): [string, string][] {
    if (!headers) return [];

    const entries =
        headers instanceof Headers
            ? [...headers.entries()]
            : Object.entries(headers as Record<string, unknown>);

    return entries
        .map(([key, value]) => [key.toLowerCase(), String(value)] as [string, string])
        .sort(([a], [b]) => a.localeCompare(b));
}

function groupKey(options: AccountingsRequestOptions): string {
    return JSON.stringify([options.baseUrl ?? getBaseUrl(), normalizeHeaders(options.headers)]);
}

function scheduleFlush() {
    if (flushTimer !== undefined) return;

    flushTimer = setTimeout(() => {
        flushTimer = undefined;
        void flushPending();
    }, 0);
}

async function flushPending() {
    const groups = [...pendingGroups.entries()];
    pendingGroups.clear();

    await Promise.all(
        groups.map(async ([key, group]) => {
            const ids = group.pending.map((request) => extractId(request.iri));

            try {
                const { accountings, failure } = await loadAccountings(ids, group.options);

                // Keep the ids that failed, not just the ones that could be loaded, so a broken
                // accounting is traceable even when many callers were merged into this batch.
                if (failure) {
                    const batchFailure: AccountingsBatchFailure = {
                        ...failure,
                        groupKey: key,
                        baseUrl: group.options.baseUrl ?? getBaseUrl(),
                    };

                    console.warn("Some accountings could not be loaded", batchFailure);
                }

                for (const request of group.pending) {
                    const id = extractId(request.iri);
                    request.resolve(id ? accountings.get(id) : undefined);
                }
            } catch (error) {
                console.warn("Error fetching accountings", {
                    groupKey: key,
                    baseUrl: group.options.baseUrl ?? getBaseUrl(),
                    requestedIds: ids,
                    error,
                });

                for (const request of group.pending) request.resolve(undefined);
            }
        }),
    );
}

/**
 * Fetches a single accounting, coalescing concurrent calls.
 *
 * Components that render one card per item (a campaign list, a table of charges) ask for their
 * accountings one by one, and all of those requests are fired within the same tick. They are
 * gathered here and sent as a single `id[]` call instead.
 *
 * @param accountingIri IRI of the accounting
 * @param options Base URL and headers for the request
 * @returns The accounting, or undefined when it cannot be fetched
 */
export function fetchAccounting(
    accountingIri: string,
    options: AccountingsRequestOptions = {},
): Promise<Accounting | undefined> {
    const id = extractId(accountingIri);
    if (!id) return Promise.resolve(undefined);

    const key = groupKey(options);
    const group = pendingGroups.get(key) ?? { options, pending: [] };
    pendingGroups.set(key, group);

    const promise = new Promise<Accounting | undefined>((resolve) => {
        group.pending.push({ iri: accountingIri, resolve });
    });

    scheduleFlush();

    return promise;
}
