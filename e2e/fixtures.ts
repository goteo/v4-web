import { test as base, expect, type Page } from "@playwright/test";

/**
 * Fails any test whose page throws an uncaught error or logs a CSP violation.
 * Import `test` and `expect` from this file instead of `@playwright/test`.
 */
export const test = base.extend<{ failOnPageErrors: void }>({
    failOnPageErrors: [
        async ({ page }, use) => {
            const errors: string[] = [];

            page.on("pageerror", (error) => errors.push(error.message));
            page.on("console", (message) => {
                if (message.type() === "error" && /Content Security Policy/i.test(message.text())) {
                    errors.push(message.text());
                }
            });

            await use();

            expect(errors, "uncaught errors or CSP violations on the page").toEqual([]);
        },
        { auto: true },
    ],
});

/**
 * Waits until every `client:load` island has hydrated (Astro removes its `ssr` attribute).
 * Clicks or typing before that hit the server HTML, which has no event handlers.
 */
export async function waitForHydration(page: Page) {
    await expect(page.locator('astro-island[client="load"][ssr]')).toHaveCount(0);
}

export { expect };
