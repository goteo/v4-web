/**
 * Determine if a request's origin host is the same as the target's host
 * @param {Request} request
 * @returns `true` if the request targets a path in the same host of the origin
 * @throws {Error} if the same origin could not be determined
 */
export function isSameHost(request: Request): boolean {
    const targetHost = new URL(request.url).host;

    const origin = request.headers.get("origin");
    if (origin) {
        return new URL(origin).host === targetHost;
    }

    const referer = request.headers.get("referer");
    if (referer) {
        return new URL(referer).host === targetHost;
    }

    throw new Error(
        "Could not determine same-host of request because origin and referer headers are missing",
    );
}
