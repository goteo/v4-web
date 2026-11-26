import { mswLoader } from "msw-storybook-addon/csf3";

import type { Preview } from "@storybook/svelte-vite";
import "../src/styles/global.css";
import "svelte-range-slider-pips/dist/range-slider-pips.css";

const preview: Preview = {
    // Stories mock API calls with `parameters.msw.handlers`; the rest reach the network
    loaders: [mswLoader()],
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },

        a11y: {
            // 'todo' - show a11y violations in the test UI only
            // 'error' - fail CI on a11y violations
            // 'off' - skip a11y checks entirely
            test: "todo",
        },
    },
};

export default preview;
