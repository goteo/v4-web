import { readFileSync } from "node:fs";

/** Test data created in testing01 by `seed.setup.ts`, found again by title on every run. */
export const seedProjects = {
    withRewards: {
        title: "E2E proyecto con recompensas",
        rewards: [
            { title: "E2E recompensa de 10 €", amount: 1000 },
            { title: "E2E recompensa de 25 €", amount: 2500 },
        ],
    },
    withoutRewards: {
        title: "E2E proyecto sin recompensas",
        rewards: [],
    },
};

export const SEED_FILE = "e2e/.auth/projects.json";

export type SeededProjects = Record<keyof typeof seedProjects, { id: number; title: string }>;

/** The projects as the seed left them, with their ids in testing01. */
export function seeded(): SeededProjects {
    return JSON.parse(readFileSync(SEED_FILE, "utf8"));
}
