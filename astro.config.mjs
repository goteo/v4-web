import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders, logHandlers } from "astro/config";
import { loadEnv } from "vite";
import { labels } from "./src/i18n/locales";

const locales = Object.keys(labels);

/**
 * The API and the object storage live on their own hosts, and both change per deployment
 * (`api-staging`, `api`, a local API…), so the CSP below has to be built from the environment
 * rather than hardcoded. This is build-time config, so reading `.env` from disk is fine.
 *
 * Astro has not loaded `.env` yet when this file is evaluated, and in CI there is no `.env`
 * at all — the same values arrive as real environment variables, which is why they win.
 * Parsing into a throwaway object rather than `process.env` keeps the rest of the build
 * looking at exactly the environment it was given.
 */
const mode = process.argv.includes("--mode")
    ? process.argv[process.argv.indexOf("--mode") + 1]
    : "development";

const env = loadEnv(mode, process.cwd(), "");
console.log(`Targeting Goteo v4 API: '${env.PUBLIC_API_URL}'`);

/** Only the origin matters to a CSP source: a path in the value would make it invalid. */
const originOf = (url) => {
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
};

const apiOrigins = [env.PUBLIC_API_URL, env.OBJECT_STORAGE_ENDPOINT].map(originOf).filter(Boolean);
/**
 * Pages that render the very same HTML for every visitor and are therefore safe to
 * store at the edge.
 *
 * A cached response is replayed to everyone who asks for that URL, so a page only
 * belongs here while it stays free of per-visitor content. The session no longer
 * reaches these pages — `App.svelte` loads it from `/api/session` after hydration —
 * which is what makes them cacheable at all.
 *
 * Paths are listed per locale on purpose. A `[locale]` placeholder would also match
 * single-segment routes like `/me`, and on an unprefixed URL the language is
 * negotiated from a cookie and `Accept-Language` (`src/middleware/utils.ts`), so the
 * same path can produce different pages and cannot be keyed by URL alone.
 */
const cacheableRoutes = {
    "": { maxAge: 60, swr: 300 },
    "/about": { maxAge: 3600, swr: 86400 },
    "/project/[idOrSlug]": { maxAge: 60, swr: 300, tags: ["projects"] },
    "/static/[fileName]": { maxAge: 3600, swr: 86400 },
    "/user/[idOrHandle]": { maxAge: 300, swr: 600, tags: ["users"] },
};

const routeRules = Object.fromEntries(
    locales.flatMap((locale) =>
        Object.entries(cacheableRoutes).map(([path, rule]) => [`/${locale}${path}`, rule]),
    ),
);

// https://astro.build/config
export default defineConfig({
    integrations: [svelte()],
    output: "server",
    session: false,

    adapter: cloudflare({
        imageService: "passthrough",
        platformProxy: { enabled: true },

        /**
         * Port the workerd inspector listens on in `astro dev`, and what
         * `.vscode/launch.json` attaches to.
         */
        inspectorPort: 9229,
    }),

    cache: {
        provider: cacheCloudflare(),
    },

    /**
     * One JSON object per line instead of prose, so Cloudflare Workers Logs indexes `level`,
     * `label` and `message` as fields — `wrangler tail` and the dashboard can then filter on
     * them, which a formatted string does not allow. Pairs with `[observability.logs]` in
     * `wrangler.toml`.
     *
     * Only for builds. `astro dev` already runs its own JSON logger internally to carry logs
     * from the daemon to `astro dev logs`, and it prints them back as prose for a human to
     * read; overriding the handler there would take that away for no gain.
     */
    logger: process.env.NODE_ENV === "production" ? logHandlers.json({ level: "info" }) : undefined,

    routeRules,

    security: {
        /**
         * On a server-rendered page Astro sends this as a `content-security-policy` response
         * header, carrying a hash for every script and style it bundles. Anything not listed
         * below is refused by the browser, which is what turns an injected `<script>` into a
         * no-op.
         *
         * Only takes effect in `build` + `preview`: the dev server serves unhashed modules,
         * so Astro skips CSP there on purpose.
         */
        csp: {
            directives: [
                // Everything not named below falls back to our own origin.
                "default-src 'self'",
                // A stolen `<base>` tag would repoint every relative URL on the page.
                "base-uri 'self'",
                // No Flash, no Java, no `<embed>`. Nothing here uses them.
                "object-src 'none'",
                // Login and checkout forms post to us; nothing should post elsewhere.
                "form-action 'self'",
                /**
                 * Clickjacking: nobody frames us. The shareable project widget lives on
                 * `www.goteo.org` (v3), not here, so no route on this origin is meant to be
                 * embedded elsewhere. Worth revisiting the day one is.
                 */
                "frame-ancestors 'self'",
                /**
                 * `https:` rather than a list of hosts. Project covers, avatars and blog
                 * artwork are URLs chosen by users and editors, so the set is not knowable at
                 * build time. `data:` and `blob:` cover local previews before upload.
                 */
                "img-src 'self' data: blob: https:",
                "media-src 'self' data: blob: https:",
                // Karla is self-hosted through the fonts API — nothing else is needed.
                "font-src 'self'",
                /**
                 * The tight one, and the reason for the whole exercise: this is what data
                 * exfiltration would have to travel through.
                 */
                `connect-src 'self' ${[...apiOrigins, "https://nominatim.openstreetmap.org"].join(" ")}`,
                /**
                 * Project videos are embedded from wherever the author hosts them — YouTube,
                 * Vimeo, or any PeerTube instance — so the host cannot be enumerated. The
                 * embed is sandboxed by the iframe boundary regardless.
                 */
                "frame-src 'self' https:",
            ],
            styleDirective: {
                resources: [
                    "'self'",
                    /**
                     * Progress bars, carousels and toggles compute widths and transforms into
                     * `style` attributes, which no hash can cover. Scoping the exception to
                     * `style-src-attr` keeps `<style>` elements hash-only, so this cannot be
                     * used to inject a stylesheet.
                     */
                    { resource: "'unsafe-inline'", kind: "attribute" },
                ],
            },
            scriptDirective: {
                /**
                 * `'self'` is what lets client islands hydrate: Astro's inline loader is
                 * covered by a hash, but it pulls each component in with a dynamic `import()`
                 * of `/_astro/*.js`, and those requests are matched against the source list.
                 *
                 * This rules out `strictDynamic`, tempting as it looks — the keyword makes
                 * browsers ignore every host source, `'self'` included, so every island
                 * fails to hydrate. Verified against a build: it blocks `App`, `Carousel`,
                 * `CampaignCard` and the rest.
                 *
                 * `unpkg.com` serves the PeerTube embed API, which the player appends to the
                 * document when a project video comes from a PeerTube instance.
                 */
                resources: ["'self'", "https://unpkg.com"],
            },
        },
    },

    /**
     * Karla is downloaded from Google at build time and served from our own origin, so no
     * request reaches a third party while a visitor reads a page.
     *
     * Karla is a variable font: the whole `200 800` range travels in a single file, which is
     * why asking for every weight the interface uses costs no extra request. The previous
     * `@fontsource/karla` import only shipped weight 400, so the ~360 `font-bold`,
     * `font-medium` and `font-semibold` usages were being faked by the browser.
     *
     * `latin-ext` is not optional here: Catalan needs U+0140 (`ŀ`) for the geminate `l·l`.
     */
    fonts: [
        {
            provider: fontProviders.google(),
            name: "Karla",
            cssVariable: "--font-karla",
            weights: ["200 800"],
            styles: ["normal", "italic"],
            subsets: ["latin", "latin-ext"],
        },
    ],

    vite: {
        plugins: [tailwindcss()],

        build: {
            minify: false,
            sourcemap: true,
        },

        ssr: {
            resolve: {
                /**
                 * Keeps the AWS SDK from being assembled out of two incompatible halves.
                 *
                 * `@aws-sdk/core` ships `exports` with a `browser` condition, and the
                 * Cloudflare adapter asks for that condition, so it resolves to
                 * `submodules/client/index.browser.js` — where `emitWarningIfUnsupportedVersion`
                 * is deliberately `Symbol.for("node-only")` rather than a function.
                 *
                 * `@aws-sdk/client-s3` has no `exports` at all. It redirects the same file
                 * through the legacy top-level `browser` field, which Vite only honours when
                 * `browser` appears in `mainFields` — and the SSR default leaves it out. So it
                 * kept the Node `runtimeConfig`, which calls that symbol as a function.
                 *
                 * `new S3Client()` runs at module scope in `src/utils/objectStorage.ts`, so the
                 * mismatch took down every upload endpoint with
                 * `TypeError: emitWarningIfUnsupportedVersion$1 is not a function` before any
                 * handler code ran. The browser build is the right half to keep: it is the one
                 * written against `fetch` and WebCrypto, which is what a Worker offers.
                 */
                mainFields: ["browser", "module", "jsnext:main", "jsnext"],
            },
        },

        /**
         * These are only ever reached through Astro's virtual modules, so Vite does not see
         * them while scanning and discovers them mid-session instead. Each discovery
         * re-optimizes and reloads the dev server, and reloading it a second time while
         * workerd already holds a module graph kills the runtime with
         * `Cannot read properties of null (reading 'function')`.
         *
         * Naming them up front gets them into the first optimize pass, so no reload happens.
         */
        optimizeDeps: {
            include: [
                "@astrojs/cloudflare/cache/provider",
                "@astrojs/svelte/server.js",
                "astro/actions/runtime/entrypoints/route.js",
                "astro/app/manifest",
                "astro/assets/services/noop",
                /**
                 * Same problem from the other side: these are imported by Svelte components,
                 * which the SSR scanner reaches through Astro's virtual entries and therefore
                 * misses. Each one was being discovered on the first rendered page, and the
                 * three reloads that followed took workerd down with the error above.
                 */
                "dexie",
                "dinero.js",
                "dinero.js/currencies",
                "flowbite-svelte",
                "tailwind-merge",
            ],
            exclude: [
                /**
                 * The AWS SDK v3 packages must not be SSR-prebundled by Vite.
                 *
                 * Vite's SSR dependency optimizer produces an invalid CJS/ESM
                 * interop wrapper for @aws-sdk/client-s3 under the Cloudflare
                 * Worker runtime. The resulting bundle fails while constructing
                 * S3Client with:
                 *
                 *   __vite_ssr_import_7__.n is not a function
                 *
                 * This happens while evaluating the module, before the API route
                 * handler runs, and Astro consequently surfaces the failure as
                 * its 404 page. Fuck JavaScript, I hate it with all of my soul,
                 * over 20 years of development and this stupid language still can't
                 * get a single fucking simple way to resolve and bundle modules,
                 * something universal in every other fucking language. Even vba can.
                 */
                "@aws-sdk/client-s3",
                "@aws-sdk/s3-request-presigner",
            ],
        },
    },

    i18n: {
        locales: locales,
        defaultLocale: "es",
        routing: "manual",
    },
});
