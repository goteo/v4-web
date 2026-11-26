import { expect, test as setup } from "@playwright/test";

/**
 * Logs in once per test account through `POST /api/session` (OAuth2 password grant)
 * and saves the session cookie to `e2e/.auth/<role>.json`.
 * Tests that need a session use `test.use({ storageState: "e2e/.auth/user.json" })`.
 */
const accounts = {
    user: { identifier: process.env.E2E_USER_EMAIL, password: process.env.E2E_USER_PASSWORD },
    admin: { identifier: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD },
};

for (const [role, { identifier, password }] of Object.entries(accounts)) {
    setup(`log in as ${role}`, async ({ request }) => {
        const prefix = `E2E_${role.toUpperCase()}`;
        setup.skip(!identifier || !password, `${prefix}_EMAIL / ${prefix}_PASSWORD not set`);

        const login = await request.post("/api/session", { data: { identifier, password } });
        expect(login.ok(), await login.text()).toBe(true);

        // The cookie is `secure`: this proves it is stored and sent back over http://localhost
        const session = await request.get("/api/session");
        expect(await session.json(), "session cookie not sent back").not.toBeNull();

        await request.storageState({ path: `e2e/.auth/${role}.json` });
    });
}
