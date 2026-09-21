/**
 * Reads configuration from whichever environment this module ends up in.
 *
 * Nothing is loaded from disk here. This file travels into the browser bundle — components
 * call `getDefaultCurrency()` and friends — and it also runs on Cloudflare Workers, where
 * there is no filesystem to read a `.env` from. Calling `dotenv.config()` from here used to
 * throw `process.cwd is not a function` in the browser, which killed hydration for every
 * island that reached this module.
 *
 * Astro loads `.env` into `import.meta.env` on its own. The one caller that runs outside
 * Astro is `openapi-ts.config.ts`, and it loads `.env` itself.
 */
let runtimeEnv: Record<string, string>;

if (typeof import.meta !== "undefined" && import.meta.env) {
    runtimeEnv = import.meta.env;
} else if (typeof process !== "undefined" && process.env) {
    runtimeEnv = process.env as Record<string, string>;
} else {
    throw new Error("Runtime not supported");
}

export function getEnvVar(key: string): string {
    const val = runtimeEnv[key];

    if (!val) {
        throw new Error(`Missing env variable: ${key}`);
    }

    return val;
}

export function getBaseUrl(): string {
    return getEnvVar("PUBLIC_API_URL");
}

export function getApiVersion(): string {
    return getEnvVar("PUBLIC_API_VERSION");
}

export function getFacebookAppId(): string {
    return getEnvVar("PUBLIC_FACEBOOK_APP_ID");
}

export function getDefaultCurrency(): string {
    return getEnvVar("PUBLIC_DEFAULT_CURRENCY");
}

export function getDefaultLanguage(): string {
    return getEnvVar("PUBLIC_DEFAULT_LANGUAGE");
}

export function getDefaultCountry(): string {
    return runtimeEnv["PUBLIC_DEFAULT_COUNTRY"] || "ES";
}
