import { test as base, expect } from "@playwright/test";

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

export { expect };
