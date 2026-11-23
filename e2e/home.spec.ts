import { expect, test, waitForHydration } from "./fixtures";
import { messages } from "./locales";

for (const [lang, t] of Object.entries(messages)) {
    test(`home renders in ${lang}`, async ({ page }) => {
        await page.goto(`/${lang}`);

        await expect(page.locator("html")).toHaveAttribute("lang", lang);
        await expect(
            page.getByRole("button", { name: t.common.header.createProject }),
        ).toBeVisible();
    });
}

test("header language switcher changes the page language", async ({ page }) => {
    await page.goto("/es");
    await waitForHydration(page);

    await page.getByRole("button", { name: "Español" }).click();
    await page.getByRole("option", { name: "English" }).click();

    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
        page.getByRole("button", { name: messages.en.common.header.createProject }),
    ).toBeVisible();
});
