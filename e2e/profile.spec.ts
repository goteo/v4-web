import { expect, test, waitForHydration } from "./fixtures";
import { messages } from "./locales";

import type { Page } from "@playwright/test";

const t = messages.es.pages.me.manage;

test.use({ storageState: "e2e/.auth/user.json" });

async function open(page: Page, path: string) {
    await page.goto(path);
    await waitForHydration(page);
}

test.describe("personal profile", () => {
    const save = (page: Page) => page.getByRole("button", { name: t.save }).click();

    test("rejects an invalid handle", async ({ page }) => {
        await open(page, "/me/manage");

        await page.getByLabel(t.info.handle).fill("No!");

        await expect(page.getByText(t.validation.handleInvalid)).toBeVisible();
    });

    test("an organization needs a legal name and a tax id", async ({ page }) => {
        await open(page, "/me/manage");

        await page.getByLabel(t.info.userType).selectOption("organization");
        await page.getByLabel(t.info.legalName).fill("");
        await page.getByLabel(t.info.taxId).fill("");
        await save(page);

        await expect(page.getByText(t.validation.required)).toHaveCount(2);
    });

    test("saves the first name", async ({ page }) => {
        await open(page, "/me/manage");

        const firstName = page.getByLabel(t.info.firstName, { exact: true });
        const original = await firstName.inputValue();
        const edited = `E2E ${Date.now()}`;

        try {
            await firstName.fill(edited);
            await save(page);
            await expect(page.getByText(t.personal.success)).toBeVisible();

            await open(page, "/me/manage");
            await expect(firstName).toHaveValue(edited);
        } finally {
            await firstName.fill(original);
            await save(page);
            await expect(page.getByText(t.personal.success)).toBeVisible();
        }
    });
});

test.describe("public profile", () => {
    test("saves the bio", async ({ page }) => {
        await open(page, "/me/manage/profile");

        const bio = page.getByPlaceholder(t.bio.placeholder);
        const save = () => page.getByRole("button", { name: t.save }).click();
        const original = await bio.inputValue();
        const edited = `E2E bio ${Date.now()}`;

        try {
            await bio.fill(edited);
            await save();
            await expect(page.getByText(t.success)).toBeVisible();

            await open(page, "/me/manage/profile");
            await expect(bio).toHaveValue(edited);
        } finally {
            await bio.fill(original);
            await save();
            await expect(page.getByText(t.success)).toBeVisible();
        }
    });
});
