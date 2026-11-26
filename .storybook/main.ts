import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";

import type { StorybookConfig } from "@storybook/svelte-vite";

const config: StorybookConfig = {
    stories: ["../src/**/*.stories.@(js|ts|svelte)"],
    // `./public` holds the MSW service worker (`pnpm exec msw init .storybook/public`)
    staticDirs: ["../public", "./public"],
    addons: [
        "@storybook/addon-svelte-csf",
        "@storybook/addon-docs",
        "@storybook/addon-vitest",
        "@storybook/addon-a11y",
    ],
    framework: "@storybook/svelte-vite",
    async viteFinal(config) {
        config.plugins = [tailwindcss(), svelte(), ...(config.plugins || [])];
        config.envPrefix = ["VITE_", "PUBLIC_"];

        return config;
    },
};
export default config;
