import { defineConfig, devices } from "@playwright/test";

// Local runs read the E2E_* credentials from .env; CI passes them as environment variables.
try {
    process.loadEnvFile();
} catch {
    // No .env file: rely on the environment
}

// Not 4321: a running `pnpm dev` would be reused, and it has no CSP
const port = 4322;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
    testDir: "e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    // Pages read the real testing01 API, which is slower than the 5 s default under parallel load
    expect: { timeout: 10_000 },
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL,
        // Spanish everywhere: pages without a language prefix and API calls (`request`) follow
        // Accept-Language, and `locale` alone only reaches the browser
        locale: "es-ES",
        extraHTTPHeaders: { "Accept-Language": "es" },
        trace: "on-first-retry",
    },
    projects: [
        { name: "setup", testMatch: /auth\.setup\.ts/ },
        { name: "seed", testMatch: /seed\.setup\.ts/, dependencies: ["setup"] },
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
            dependencies: ["seed"],
        },
    ],
    // `preview` and not `dev`: the CSP only applies to built output, and preview runs on workerd.
    // `--ignore-lock` keeps it in the foreground: Astro backgrounds it when run by an AI agent.
    webServer: {
        command: `pnpm build && pnpm preview --ignore-lock --port ${port}`,
        url: baseURL,
        env: { E2E: "true" },
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
    },
});
