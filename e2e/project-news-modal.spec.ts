import { expect, test } from "playwright/test";

import type { Page } from "playwright/test";

const PROJECT_PATH = "/es/project/mock-project";
const SECOND_PROJECT_PATH = "/es/project/mock-project-2";
const PROJECT_ID = 1;
const SECOND_PROJECT_ID = 2;
const SUPPORTER_ID = 100;
const SUPPORTER_ACCOUNTING = "/v4/accountings/100";
const NON_SUPPORTER_ID = 200;
const NON_SUPPORTER_ACCOUNTING = "/v4/accountings/200";
const UPDATE_ID = 9001;
const SECOND_UPDATE_ID = 9002;
const UPDATE_TITLE = "Novedad de prueba";
const SECOND_UPDATE_TITLE = "Novedad del segundo proyecto";

function sessionFor(userId: number, accounting: string) {
    return {
        token: {
            token_type: "Bearer",
            expires_in: 3600,
            access_token: "mock-access-token",
            asHttpHeaders: {},
        },
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        user: {
            id: userId,
            handle: `user-${userId}`,
            email: `user-${userId}@example.com`,
            displayName: `User ${userId}`,
            accounting,
        },
        accounting: { id: userId },
    };
}

const supportCollection = {
    "@context": "/v4/contexts/ProjectSupport",
    "@id": "/v4/project_supports",
    "@type": "Collection",
    totalItems: 1,
    member: [
        {
            id: 1,
            project: `/v4/projects/${PROJECT_ID}`,
            origin: SUPPORTER_ACCOUNTING,
            displayName: "Mock Supporter",
            money: { amount: 1000, currency: "EUR" },
            anonymous: false,
            matchfunding: false,
        },
    ],
};

const emptySupportCollection = {
    ...supportCollection,
    totalItems: 0,
    member: [],
};

function updateFixture(id: number, projectId: number, title: string) {
    return {
        id,
        project: `/v4/projects/${projectId}`,
        title,
        subtitle: "Subtítulo de prueba",
        body: "Contenido de la novedad de prueba.",
        date: new Date().toISOString(),
        author: "/v4/users/10",
        locales: ["es"],
    };
}

function storageKey(userId: number, projectId: number): string {
    return `goteo-project-news-modal:${userId}:${projectId}`;
}

function collectNewsLogs(page: Page): string[] {
    const logs: string[] = [];

    page.on("console", (message) => {
        const text = message.text();

        if (text.includes("[project-news]")) logs.push(text);
    });

    return logs;
}

async function waitForNewsLog(logs: string[], fragment: string): Promise<void> {
    await expect
        .poll(() => logs.some((line) => line.includes(fragment)), { timeout: 15_000 })
        .toBe(true);
}

async function mockSession(
    page: Page,
    session: ReturnType<typeof sessionFor> | null,
): Promise<void> {
    await page.route("**/api/session", (route) =>
        route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(session),
        }),
    );
}

async function mockSupport(page: Page, supported: boolean): Promise<void> {
    await page.route("**/api/relay/v4/project_supports**", (route) =>
        route.fulfill({
            status: 200,
            contentType: "application/ld+json",
            body: JSON.stringify(supported ? supportCollection : emptySupportCollection),
        }),
    );
}

async function mockUpdates(page: Page, updates: unknown[]): Promise<void> {
    await page.route("**/v4/project_updates**", (route) =>
        route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(updates),
        }),
    );
}

async function seedSeenUpdate(
    page: Page,
    userId: number,
    projectId: number,
    updateId: number,
): Promise<void> {
    await page.addInitScript(
        ({ key, value }) => {
            try {
                window.localStorage.setItem(key, value);
            } catch {
                // Opaque origins do not expose localStorage.
            }
        },
        { key: storageKey(userId, projectId), value: String(updateId) },
    );
}

test.describe("Project news modal", () => {
    test.beforeEach(async ({ page }) => {
        // Keep every client-side API call deterministic. The more specific
        // handlers below are registered later and therefore take precedence.
        await page.route("**/v4/**", (route) =>
            route.fulfill({
                status: 200,
                contentType: "application/json",
                body: "[]",
            }),
        );
    });

    test("does not open for anonymous visitors", async ({ page }) => {
        const logs = collectNewsLogs(page);

        await mockSession(page, null);
        await page.goto(PROJECT_PATH);

        await waitForNewsLog(logs, "waiting for an authenticated session");
        await expect(page.locator("dialog")).toHaveCount(0);
    });

    test("does not open for a signed-in user without a project support", async ({ page }) => {
        const logs = collectNewsLogs(page);

        await mockSession(page, sessionFor(NON_SUPPORTER_ID, NON_SUPPORTER_ACCOUNTING));
        await mockSupport(page, false);
        await mockUpdates(page, [updateFixture(UPDATE_ID, PROJECT_ID, UPDATE_TITLE)]);

        await page.goto(PROJECT_PATH);

        await waitForNewsLog(logs, "the user has not supported this project");
        await expect(page.locator("dialog")).toHaveCount(0);
    });

    test("opens for a supporter with a new update and stays dismissed after closing", async ({
        page,
    }) => {
        const logs = collectNewsLogs(page);

        await mockSession(page, sessionFor(SUPPORTER_ID, SUPPORTER_ACCOUNTING));
        await mockSupport(page, true);
        await mockUpdates(page, [updateFixture(UPDATE_ID, PROJECT_ID, UPDATE_TITLE)]);

        await page.goto(PROJECT_PATH);

        await waitForNewsLog(logs, "opening the news modal");

        const dialog = page.locator("dialog");
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(UPDATE_TITLE);

        await dialog.locator("button").last().click({ force: true });

        await expect
            .poll(() =>
                page.evaluate(
                    (key) => window.localStorage.getItem(key),
                    storageKey(SUPPORTER_ID, PROJECT_ID),
                ),
            )
            .toBe(String(UPDATE_ID));

        await page.reload();

        await waitForNewsLog(logs, "the latest update was already dismissed");
        await expect(page.locator("dialog")).toHaveCount(0);
    });

    test("does not open when the project has no updates", async ({ page }) => {
        const logs = collectNewsLogs(page);

        await mockSession(page, sessionFor(SUPPORTER_ID, SUPPORTER_ACCOUNTING));
        await mockSupport(page, true);
        await mockUpdates(page, []);

        await page.goto(PROJECT_PATH);

        await waitForNewsLog(logs, "no updates found for the project");
        await expect(page.locator("dialog")).toHaveCount(0);
    });

    test("does not reopen an update already dismissed by the same user", async ({ page }) => {
        const logs = collectNewsLogs(page);

        await seedSeenUpdate(page, SUPPORTER_ID, PROJECT_ID, UPDATE_ID);
        await mockSession(page, sessionFor(SUPPORTER_ID, SUPPORTER_ACCOUNTING));
        await mockSupport(page, true);
        await mockUpdates(page, [updateFixture(UPDATE_ID, PROJECT_ID, UPDATE_TITLE)]);

        await page.goto(PROJECT_PATH);

        await waitForNewsLog(logs, "the latest update was already dismissed");
        await expect(page.locator("dialog")).toHaveCount(0);
    });

    test("recalculates the dismissed state when the user changes", async ({ page }) => {
        const logs = collectNewsLogs(page);

        await seedSeenUpdate(page, SUPPORTER_ID, PROJECT_ID, UPDATE_ID);
        await mockSession(page, sessionFor(NON_SUPPORTER_ID, NON_SUPPORTER_ACCOUNTING));
        await mockSupport(page, true);
        await mockUpdates(page, [updateFixture(UPDATE_ID, PROJECT_ID, UPDATE_TITLE)]);

        await page.goto(PROJECT_PATH);

        await waitForNewsLog(logs, "opening the news modal");
        await expect(page.locator("dialog")).toContainText(UPDATE_TITLE);
    });

    test("does not reuse the dismissed state across projects", async ({ page }) => {
        const logs = collectNewsLogs(page);

        await seedSeenUpdate(page, SUPPORTER_ID, PROJECT_ID, UPDATE_ID);
        await mockSession(page, sessionFor(SUPPORTER_ID, SUPPORTER_ACCOUNTING));
        await mockSupport(page, true);
        await mockUpdates(page, [
            updateFixture(SECOND_UPDATE_ID, SECOND_PROJECT_ID, SECOND_UPDATE_TITLE),
        ]);

        await page.goto(SECOND_PROJECT_PATH);

        await waitForNewsLog(logs, "opening the news modal");
        await expect(page.locator("dialog")).toContainText(SECOND_UPDATE_TITLE);
    });
});
