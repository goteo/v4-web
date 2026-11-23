import { expect, test, waitForHydration } from "./fixtures";
import { messages } from "./locales";
import { seeded, seedProjects } from "./seed";

const t = messages.es;
const edit = t.pages.project.edit;

test.use({ storageState: "e2e/.auth/user.json" });

test("the owner manages the project", async ({ page }) => {
    const { ownedByUser } = seeded();

    await page.goto(`/project/${ownedByUser.id}/manage`);

    await expect(page.getByRole("heading", { level: 1, name: ownedByUser.title })).toBeVisible();
    await expect(page.getByText(seedProjects.ownedByUser.rewards[0].title)).toBeVisible();
    await expect(
        page.getByRole("heading", { name: t.pages.project.manage.claims.title }),
    ).toBeVisible();

    await page.getByRole("link", { name: t.pages.project.manage.editProject }).click();

    await expect(page).toHaveURL(/\/edit$/);
});

test("someone else's project cannot be managed", async ({ page }) => {
    const response = await page.goto(`/project/${seeded().withRewards.id}/manage`);

    expect(response?.status()).toBe(403);
    await expect(page.getByText(t.pages["403"].title)).toBeVisible();
});

test("an approved project keeps its release date", async ({ page }) => {
    await page.goto(`/project/${seeded().ownedByUser.id}/edit`);

    await expect(page.getByText(edit.configuration.release.passed)).toBeVisible();
});

test("the owner creates, edits and deletes a reward", async ({ page }) => {
    const title = `E2E recompensa ${Date.now()}`;
    const renamed = `${title} editada`;
    const card = (name: string) =>
        page.getByRole("heading", { level: 3, name: new RegExp(`${name}$`) });

    await page.goto(`/project/${seeded().ownedByUser.id}/edit`);
    await waitForHydration(page);
    await page.getByRole("tab", { name: edit.tabs.rewards }).click();

    try {
        await page.getByRole("button", { name: edit.rewards.add.button }).click();
        const modal = page.getByRole("dialog");
        await modal.getByRole("textbox", { name: edit.rewards.modal.form.titleLabel }).fill(title);
        await modal.locator("[contenteditable=true]").fill("Creada por los tests E2E");
        await modal.getByRole("textbox", { name: edit.rewards.modal.form.moneyLabel }).fill("20");
        await modal.getByRole("button", { name: t.common.save }).click();

        await expect(card(title)).toBeVisible();

        await rewardCard(page, title).getByRole("button", { name: t.common.edit }).click();
        await modal
            .getByRole("textbox", { name: edit.rewards.modal.form.titleLabel })
            .fill(renamed);
        await modal.getByRole("button", { name: t.common.save }).click();

        await expect(card(renamed)).toBeVisible();

        await rewardCard(page, renamed).getByRole("button", { name: t.common.delete }).click();
        await page.getByRole("dialog").getByRole("button", { name: t.common.delete }).click();

        await expect(card(renamed)).toHaveCount(0);
    } finally {
        // Leave the seeded project as it was if the test stopped half way
        const rewards = await page.request
            .get(`/api/relay/v4/project_rewards?project=${seeded().ownedByUser.id}`, {
                headers: { Accept: "application/json" },
            })
            .then((response) => response.json());

        for (const reward of rewards.filter((r: { title: string }) => r.title.startsWith(title))) {
            await page.request.delete(`/api/relay/v4/project_rewards/${reward.id}`);
        }
    }
});

/** The editor card holding the reward titled `title` */
function rewardCard(page: import("@playwright/test").Page, title: string) {
    return page
        .locator("div")
        .filter({ has: page.getByRole("heading", { level: 3, name: new RegExp(`${title}$`) }) })
        .filter({ has: page.getByRole("button", { name: t.common.edit }) })
        .last();
}
