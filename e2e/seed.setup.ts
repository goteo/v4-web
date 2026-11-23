import { existsSync, writeFileSync } from "node:fs";

import { expect, test as setup } from "@playwright/test";

import { SEED_FILE, seedProjects, type SeededProjects } from "./seed";

import type { APIRequestContext } from "@playwright/test";

const STATES = { admin: "e2e/.auth/admin.json", user: "e2e/.auth/user.json" };

/**
 * Leaves the `seedProjects` in testing01 as the tests expect them: created by their owner,
 * in campaign, with their rewards. Idempotent, so it repairs data someone changed by hand.
 * Goes through `/api/relay`, which calls the API with each account's session cookie.
 */
setup("seed test projects", async ({ playwright }, testInfo) => {
    setup.skip(
        !existsSync(STATES.admin) || !existsSync(STATES.user),
        "no test sessions: E2E_ADMIN_* / E2E_USER_* not set",
    );

    const contextOf = (storageState: string) =>
        playwright.request.newContext({ ...testInfo.project.use, storageState });
    const owners = {
        admin: relay(await contextOf(STATES.admin)),
        user: relay(await contextOf(STATES.user)),
    };
    const api = owners.admin;
    const [category] = await api.get("/v4/categories");
    const seededProjects = {} as SeededProjects;

    for (const [key, wanted] of Object.entries(seedProjects)) {
        const found = await api.get(`/v4/projects?title=${encodeURIComponent(wanted.title)}`);
        let project = found.find((p: { title: string }) => p.title === wanted.title);

        const texts = { title: wanted.title, subtitle: "Proyecto de prueba para los tests E2E" };

        project ??= await owners[wanted.owner].send("POST", "/v4/projects", {
            ...texts,
            categories: [`/v4/categories/${category.id}`],
            territory: { country: "ES" },
            calendar: { release: new Date().toISOString() },
        });

        // Content is stored in the request language: without Spanish the page shows a warning
        if (!project.locales?.includes("es")) {
            project = await api.send("PATCH", `/v4/projects/${project.id}`, texts);
        }

        // An admin may make any move; going through `to_campaign` starts the campaign calendar today
        if (project.status !== "in_campaign") {
            await api.send("PATCH", `/v4/projects/${project.id}`, { status: "to_campaign" });
            project = await api.send("PATCH", `/v4/projects/${project.id}`, {
                status: "in_campaign",
            });
        }

        const rewards = await api.get(`/v4/project_rewards?project=${project.id}`);

        for (const reward of wanted.rewards) {
            const rewardTexts = {
                title: reward.title,
                description: "Recompensa de prueba para los tests E2E",
            };
            const existing = rewards.find((r: { title: string }) => r.title === reward.title);

            if (existing) {
                if (!existing.locales?.includes("es")) {
                    await api.send("PATCH", `/v4/project_rewards/${existing.id}`, rewardTexts);
                }
                continue;
            }

            await api.send("POST", "/v4/project_rewards", {
                project: `/v4/projects/${project.id}`,
                ...rewardTexts,
                money: { amount: reward.amount, currency: "EUR" },
                hasShipping: false,
                isFinite: true,
                unitsTotal: 1000,
            });
        }

        seededProjects[key as keyof SeededProjects] = { id: project.id, title: project.title };
    }

    writeFileSync(SEED_FILE, JSON.stringify(seededProjects, null, 4));
});

function relay(request: APIRequestContext) {
    async function call(method: string, path: string, data?: object) {
        const response = await request.fetch(`/api/relay${path}`, {
            method,
            data,
            headers: {
                Accept: "application/json",
                "Content-Language": "es",
                "Content-Type":
                    method === "PATCH" ? "application/merge-patch+json" : "application/json",
            },
        });

        expect(response.ok(), `${method} ${path}: ${await response.text()}`).toBe(true);

        return response.json();
    }

    return { get: (path: string) => call("GET", path), send: call };
}
