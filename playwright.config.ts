import { defineConfig, devices } from "playwright/test";

const APP_PORT = 4399;
const MOCK_API_PORT = 4398;
const APP_URL = `http://localhost:${APP_PORT}`;
const MOCK_API_URL = `http://127.0.0.1:${MOCK_API_PORT}`;

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: false,
    workers: 1,
    timeout: 60_000,
    expect: {
        timeout: 10_000,
    },
    reporter: [["list"]],
    use: {
        baseURL: APP_URL,
        trace: "retain-on-failure",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: [
        {
            command: `MOCK_API_PORT=${MOCK_API_PORT} node e2e/mock-api.mjs`,
            url: `${MOCK_API_URL}/health`,
            reuseExistingServer: false,
            timeout: 30_000,
        },
        {
            command: `printf 'PUBLIC_API_URL=${MOCK_API_URL}\\n' > .dev.vars.e2e && pnpm dev --port ${APP_PORT} --ignore-lock`,
            url: `${APP_URL}/api/session`,
            reuseExistingServer: false,
            timeout: 180_000,
            env: {
                CLOUDFLARE_ENV: "e2e",
            },
        },
    ],
});
