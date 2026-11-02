import { createBrowserCacheInterceptor } from "./cacheFetch";
import { client } from "./client/client.gen";

let _interceptor: ReturnType<typeof createBrowserCacheInterceptor> | null = null;
let _interceptorId: number | null = null;

export function getCacheInterceptor() {
    return _interceptor;
}

export function getCacheInterceptorId() {
    return _interceptorId;
}

export function initCacheInterceptor() {
    if (import.meta.env.PUBLIC_CSCACHE !== "true") {
        return null;
    }

    _interceptor = createBrowserCacheInterceptor();
    _interceptorId = client.interceptors.request.use(_interceptor);
    return _interceptorId;
}

/**
 * Marks a read as uncacheable.
 *
 * Ejecting the Cache Storage interceptor is not enough: the API marks its responses as
 * publicly cacheable for an hour, so the browser's HTTP cache answers repeated GETs with
 * a stale body. A read served right after a mutation then still shows the deleted
 * resource, and acting on it again fails with a 404.
 *
 * Only reads are rewritten: they are the only requests that can be answered from a cache,
 * and rebuilding a request that carries a body is not always possible.
 */
const bypassHttpCache = (request: Request) =>
    request.method === "GET" ? new Request(request, { cache: "no-store" }) : request;

export async function withoutCache<T>(fn: () => Promise<T>): Promise<T> {
    client.interceptors.request.use(bypassHttpCache);

    if (_interceptor) {
        client.interceptors.request.eject(_interceptor);
    }

    try {
        return await fn();
    } finally {
        client.interceptors.request.eject(bypassHttpCache);

        if (_interceptor) {
            client.interceptors.request.use(_interceptor);
        }
    }
}
