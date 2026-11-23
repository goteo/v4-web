import { expect, test } from "./fixtures";

test("home page loads", async ({ page }) => {
    const response = await page.goto("/");

    expect(response?.status()).toBe(200);
    await expect(page.locator("main")).toBeVisible();
});
