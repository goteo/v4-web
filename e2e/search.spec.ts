import { expect, test, waitForHydration } from "./fixtures";
import { messages } from "./locales";

const t = messages.es.pages.search;

test("search with no matches shows the empty state", async ({ page }) => {
    await page.goto("/search");
    await waitForHydration(page);

    await page.getByPlaceholder(t.input.placeholder).fill("e2e-no-project-has-this-title");

    await expect(page.getByText(t.empty.title)).toBeVisible();
    await expect(page).toHaveURL(/title=e2e-no-project-has-this-title/);
});
