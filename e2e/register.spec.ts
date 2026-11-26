import { expect, test, waitForHydration } from "./fixtures";
import { messages } from "./locales";

const t = messages.es.pages.checkout.register;

test("register rejects an invalid email", async ({ page }) => {
    await page.goto("/register");
    await waitForHydration(page);

    await page.getByPlaceholder(t.individual.email).fill("not-an-email");

    await expect(page.getByText(t.form.validation.emailInvalid)).toBeVisible();
});
