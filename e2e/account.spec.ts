import { expect, test, waitForHydration } from "./fixtures";
import { messages } from "./locales";

const t = messages.es;

test.use({ storageState: "e2e/.auth/user.json" });

test("user menu leads to the profile and hides the admin link", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    await page.getByRole("button", { name: new RegExp(`^${t.common.greeting},`) }).click();

    await expect(page.getByRole("link", { name: t.common.header.admin })).toHaveCount(0);
    await page.getByRole("link", { name: t.common.header.goToProfile }).click();

    await expect(page).toHaveURL(/\/me$/);
});

test("verifying an unknown checkout shows the payment error", async ({ page }) => {
    await page.goto("/checkout/verify?checkoutId=e2e-unknown");

    await expect(page.getByText(t.pages.checkout.verify.error.title)).toBeVisible();
});
