/**
 * Lowercases `value` and strips diacritics (Unicode NFD), so "Á" matches "a".
 */
export function normalizeForMatch(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

/**
 * Highlights all matches of `query` inside `text` using a <mark> tag,
 * ignoring case and accent differences (diacritics).
 *
 * This function normalizes both `text` and `query` using Unicode NFD,
 * so characters like "á" will match "a".
 *
 * @param text - The original text where the search will be performed.
 * @param query - The search term to highlight.
 * @param markClass - The class name or style to apply to the <mark> tag (e.g., "bg-yellow-200").
 * @returns The original text with all matches wrapped in a <mark> tag.
 */
export function highlightMatch(
    text: string,
    query: string,
    markClass: string = "bg-yellow-200",
): string {
    if (!query.trim()) return text;

    const normalizedText = normalizeForMatch(text);
    const normalizedQuery = normalizeForMatch(query);

    const matchPositions: { start: number; end: number }[] = [];
    const regex = new RegExp(normalizedQuery, "gi");
    let match: RegExpExecArray | null;

    while ((match = regex.exec(normalizedText)) !== null) {
        matchPositions.push({ start: match.index, end: match.index + match[0].length });
    }

    if (matchPositions.length === 0) return text;

    const mapping: number[] = [];
    let originalIndex = 0;
    for (const char of text.normalize("NFD")) {
        if (!char.match(/[\u0300-\u036f]/)) {
            mapping.push(originalIndex);
        }
        originalIndex++;
    }

    let result = "";
    let lastIndex = 0;

    for (const { start, end } of matchPositions) {
        const originalStart = mapping[start] ?? text.length;
        const originalEnd = mapping[end - 1] !== undefined ? mapping[end - 1] + 1 : text.length;

        result += text.slice(lastIndex, originalStart);
        result += `<mark class="${markClass}">${text.slice(originalStart, originalEnd)}</mark>`;
        lastIndex = originalEnd;
    }

    result += text.slice(lastIndex);
    return result;
}
