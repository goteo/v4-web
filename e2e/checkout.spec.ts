import { expect, test, waitForHydration } from "./fixtures";
import { messages } from "./locales";
import { seeded, seedProjects } from "./seed";

const t = messages.es;

test.use({ storageState: "e2e/.auth/user.json" });

test("a reward goes from the project to the payment step", async ({ page }) => {
    const [reward] = seedProjects.withRewards.rewards;

    await page.goto(`/project/${seeded().withRewards.id}`);
    await waitForHydration(page);

    await page
        .getByRole("button", {
            name: t.common.donateAmount.replace("{{ amount }}", `${reward.amount / 100} €`),
        })
        .first()
        .click();
    await page
        .getByRole("dialog")
        .getByRole("button", { name: t.common.donate, exact: true })
        .click();

    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByText(reward.title)).toBeVisible();

    await page.getByRole("link", { name: t.common.continue }).click();

    await expect(page).toHaveURL(/\/checkout\/payment$/);
    await expect(page.getByRole("heading", { name: t.pages.checkout.payment.title })).toBeVisible();

    for (const gateway of ["PayPal", "Stripe"]) {
        await page.getByRole("radio", { name: gateway }).check();
        await expect(page.getByRole("radio", { name: gateway })).toBeChecked();
        await expect(page.getByRole("button", { name: t.common.continue })).toBeEnabled();
    }
});
