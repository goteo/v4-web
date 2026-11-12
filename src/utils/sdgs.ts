// ponytail: static theme slug → SDG map, the API does not model SDGs yet. Move it there when it does.
const SDGS_BY_THEME: Record<string, number[]> = {
    democracy: [5, 10, 16],
    "science-and-tech": [9],
    "social-economy": [8],
    journalism: [16],
    education: [4],
    culture: [11],
    sustainability: [7, 13],
    "health-and-cares": [3],
    "rural-and-ecology": [2, 15],
};

export function sdgsForThemes(slugs: string[]): number[] {
    const goals = new Set(slugs.flatMap((slug) => SDGS_BY_THEME[slug] ?? []));

    return [...goals].sort((a, b) => a - b);
}
