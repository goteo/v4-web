import { defineConfig, devices } from "@playwright/test";

// Local runs read the E2E_* credentials from .env; CI passes them as environment variables.
try {
    process.loadEnvFile();
} catch {
    // No .env file: rely on the environment
}

const baseURL = "http://localhost:4321";

export default defineConfig({
    testDir: "e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL,
        // Paths without a language prefix follow Accept-Language: es is the default one
        locale: "es-ES",
        trace: "on-first-retry",
    },
    projects: [
        { name: "setup", testMatch: /.*\.setup\.ts/ },
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
            dependencies: ["setup"],
        },
    ],
    // `preview` and not `dev`: the CSP only applies to built output, and preview runs on workerd.
    // `--ignore-lock` keeps it in the foreground: Astro backgrounds it when run by an AI agent.
    webServer: {
        command: "pnpm build && pnpm preview --ignore-lock",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
    },
});
