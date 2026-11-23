import { expect, test, waitForHydration } from "./fixtures";
import { messages } from "./locales";
import { seeded, seedProjects } from "./seed";

const t = messages.es;

test("project page shows the campaign", async ({ page }) => {
    const { withRewards } = seeded();

    const response = await page.goto(`/project/${withRewards.id}`);

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: withRewards.title })).toBeVisible();
    await expect(
        page.getByRole("button", { name: t.domain.project.campaign.donate }),
    ).toBeEnabled();
});

test("an unknown project is a 404", async ({ page }) => {
    const response = await page.goto("/project/e2e-this-project-does-not-exist");

    expect(response?.status()).toBe(404);
});

test.describe("rewards", () => {
    const [small, large] = seedProjects.withRewards.rewards;
    const donate = (amount: number) =>
        t.common.donateAmount.replace("{{ amount }}", `${amount / 100} €`);
    const rewards = t.pages.project.view.rewards;

    test.beforeEach(async ({ page }) => {
        await page.goto(`/project/${seeded().withRewards.id}`);
        await waitForHydration(page);
    });

    test("each reward shows its minimum amount", async ({ page }) => {
        const top = page.getByRole("listitem").filter({ hasText: small.title });

        await expect(top.getByRole("button", { name: donate(small.amount) })).toBeVisible();
        await expect(
            page
                .getByRole("listitem")
                .filter({ hasText: large.title })
                .getByRole("button", {
                    name: donate(large.amount),
                }),
        ).toBeVisible();
    });

    test("choosing a reward puts it in the cart", async ({ page }) => {
        await page
            .getByRole("button", { name: donate(small.amount) })
            .first()
            .click();
        await page.getByRole("button", { name: rewards.addToCart }).click();

        // The header cart icon only shows once the cart has items; it has no accessible name
        await page.locator('header a[href="/checkout"]').click();

        await expect(page.getByText(small.title)).toBeVisible();
        await expect(
            page.getByRole("heading", { name: t.pages.checkout.summary.total.title }),
        ).toBeVisible();
    });

    test("an amount under the reward minimum is rejected", async ({ page }) => {
        await page
            .getByRole("button", { name: donate(large.amount) })
            .first()
            .click();
        await page.getByRole("textbox", { name: t.domain.project.reward.donation }).fill("5");
        await page.getByRole("button", { name: rewards.addToCart }).click();

        // The modal renders the amount field twice (mobile and desktop layouts)
        await expect(
            page.getByText(rewards.error.invalidAmount).filter({ visible: true }),
        ).toBeVisible();
        // An anonymous visitor only gets the header cart icon once the cart has items
        await expect(page.locator('header a[href="/checkout"]')).toHaveCount(0);
    });
});
