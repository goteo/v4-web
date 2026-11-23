import { expect, test, waitForHydration } from "./fixtures";
import { messages } from "./locales";

const t = messages.es;

test.describe("as admin", () => {
    test.use({ storageState: "e2e/.auth/admin.json" });

    test("user menu shows the admin link", async ({ page }) => {
        await page.goto("/");
        await waitForHydration(page);

        await page.getByRole("button", { name: new RegExp(`^${t.common.greeting},`) }).click();

        await expect(page.getByRole("link", { name: t.common.header.admin })).toBeVisible();
    });

    test("charges dashboard loads", async ({ page }) => {
        await page.goto("/admin/charges");

        await expect(
            page.getByRole("heading", { name: t.pages.admin.charges.title, exact: true }),
        ).toBeVisible();
        await expect(page.getByText(t.pages.admin.charges.lastContributions)).toBeVisible();
    });
});

test.describe("as user", () => {
    test.use({ storageState: "e2e/.auth/user.json" });

    test("admin pages are forbidden", async ({ page }) => {
        // TODO: also expect status 403 once the /403 page sets it (it answers 200 today)
        await page.goto("/admin/charges");

        await expect(page.getByText(t.pages["403"].title)).toBeVisible();
    });
});
