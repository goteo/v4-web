/**
 * Extracts the last numeric ID from an IRI by walking its path segments backwards.
 *
 * @param iri - A string representing an IRI
 * @returns The last numeric segment as a string, or null if not found
 */
export function extractId(iri?: string): string | null {
    if (!iri) return null;

    const parts = iri.split("/").filter(Boolean).reverse();

    for (const part of parts) {
        if (!Number.isNaN(parseInt(part, 10))) {
            return part;
        }
    }

    return null;
}
