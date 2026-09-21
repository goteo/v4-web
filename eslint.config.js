// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import pluginJs from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import globals from "globals";
import tseslint from "typescript-eslint";
import sveltePlugin from "eslint-plugin-svelte";
import unusedImportsPlugin from "eslint-plugin-unused-imports";
import svelteConfig from "./svelte.config.js";
import svelteParser from "svelte-eslint-parser";

/** @type {import('eslint').Linter.Config[]} */
export default [
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    ...sveltePlugin.configs.recommended,
    { files: ["**/*.{js,mjs,cjs,ts}"] },
    { languageOptions: { globals: globals.browser } },
    // Root config files run in Node at build time, not in the browser.
    {
        files: ["*.config.{js,mjs,cjs,ts}"],
        languageOptions: { globals: globals.node },
    },
    {
        ignores: [
            "node_modules/**",
            "dist/**",
            "build/**",
            ".wrangler/**",
            "coverage/**",
            "public/**",
            "*.min.js",
            "eslint.config.js",
            ".astro/**",
            ".astro/**/*",
            "src/openapi/client/**",
            ".github/**",
            "env.d.ts",
            "storybook-static/**",
            "graphify-out/**",
            "worker-configuration.d.ts",
        ],
    },
    {
        plugins: {
            import: importPlugin,
            "unused-imports": unusedImportsPlugin,
        },
        rules: {
            "import/order": [
                "error",
                {
                    groups: [
                        "builtin",
                        "external",
                        "internal",
                        ["parent", "sibling", "index"],
                        "type",
                    ],
                    "newlines-between": "always",
                    alphabetize: {
                        order: "asc",
                        caseInsensitive: true,
                    },
                },
            ],
            "@typescript-eslint/no-explicit-any": "off",
            "unused-imports/no-unused-imports": "error",
            // An `_` prefix marks a binding that exists only to satisfy a
            // signature or a destructuring position — never a leftover.
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    args: "all",
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                    destructuredArrayIgnorePattern: "^_",
                },
            ],
        },
    },
    // Svelte module scripts
    {
        files: ["**/*.svelte.ts"],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                projectService: true,
            },
        },
    },
    // Svelte configuration
    {
        files: ["**/*.svelte"],
        languageOptions: {
            parser: svelteParser,
            parserOptions: {
                projectService: true,
                extraFileExtensions: [".svelte"],
                parser: tseslint.parser,
                svelteConfig,
            },
        },
        rules: {
            "import/order": [
                "error",
                {
                    groups: [
                        "builtin",
                        "external",
                        "internal",
                        ["parent", "sibling", "index"],
                        "type",
                    ],
                    "newlines-between": "always",
                    alphabetize: {
                        order: "asc",
                        caseInsensitive: true,
                    },
                },
            ],
            "no-unsafe-finally": "off",
            "unused-imports/no-unused-imports": "error",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    args: "all",
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                    destructuredArrayIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/no-unused-expressions": "off",
            "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
            "svelte/require-each-key": "off",
            "svelte/no-at-html-tags": "off",
            "svelte/prefer-writable-derived": "off",
            "svelte/prefer-svelte-reactivity": "off",
            "svelte/no-unused-props": "warn",
            "svelte/no-useless-children-snippet": "warn",
            // False positives on $bindable/$props defaults used only in the template:
            // the core rule analyses the JS AST and can't see Svelte template usage.
            "no-useless-assignment": "off",
        },
    },
    ...storybook.configs["flat/recommended"],
];
