import * as operationPaths from "../openapi/client/operation-paths.gen";

// SDK item routes as anchored regexes: "/v4/users/{id}/person" → /^\/v4\/users\/([^/]+)\/person$/
const itemRoutes = [...new Set(Object.values(operationPaths))]
    .filter((path) => path.includes("{"))
    .map((path) => new RegExp(`^${path.replace(/\{[^}]+\}/g, "([^/]+)")}$`));

/**
 * Extracts the ID (numeric id, slug or handle) from an IRI by matching it against the SDK routes.
 *
 * @param iri - An IRI (e.g. "/v4/users/42/person"), a full URL, or a plain id
 * @returns The route's ID segment, the last path segment if no route matches, or null if empty
 */
export function extractId(iri?: string): string | null {
    if (!iri) return null;

    const { pathname } = new URL(iri, "http://localhost");

    for (const route of itemRoutes) {
        const match = pathname.match(route);
        if (match) return decodeURIComponent(match[1]);
    }

    return pathname.split("/").filter(Boolean).pop() ?? null;
}
