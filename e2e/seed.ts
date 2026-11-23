import { readFileSync } from "node:fs";

/** Test data created in testing01 by `seed.setup.ts`, found again by title on every run. */
export const seedProjects = {
    withRewards: {
        owner: "admin",
        title: "E2E proyecto con recompensas",
        rewards: [
            { title: "E2E recompensa de 10 €", amount: 1000 },
            { title: "E2E recompensa de 25 €", amount: 2500 },
        ],
    },
    withoutRewards: {
        owner: "admin",
        title: "E2E proyecto sin recompensas",
        rewards: [],
    },
    /** Approved project of the test user, for the project management tests */
    ownedByUser: {
        owner: "user",
        title: "E2E proyecto del usuario",
        rewards: [{ title: "E2E recompensa del usuario", amount: 1500 }],
    },
} as const;

export const SEED_FILE = "e2e/.auth/projects.json";

export type SeededProjects = Record<keyof typeof seedProjects, { id: number; title: string }>;

/** The projects as the seed left them, with their ids in testing01. */
export function seeded(): SeededProjects {
    return JSON.parse(readFileSync(SEED_FILE, "utf8"));
}
