---
name: org.goteo.www
description: Provides a web GUI to interact with the Goteo v4 API and adds tools for implementing the crowdfunding platform Goteo as an open-core application. Use it when writing or reviewing source code for the Goteo v4 web.
---

# Goteo v4 Web Codebase Reference

## Stack

Astro 7 + Svelte 5 + TailwindCSS 4 + TypeScript 5, deployed on Cloudflare Workers (also supports Node adapter). Requires Node 22.12+.

## Folder structure

```bash
src/
├── actions/          # Astro server actions (form mutations)
├── auth/             # JWT sessions, OAuth2 tokens, refresh logic
├── components/       # Svelte components (PascalCase filenames)
│   ├── library/      # Reusable UI primitives, by category:
│   │                 #   buttons/, cards/, dropdown/, feedback/, inputs/,
│   │                 #   layout/, share/, tags/, theme/, typography/
│   ├── icons/        # Icon SVG components, by category:
│   │                 #   actions/, commerce/, filters/, media/, navigation/,
│   │                 #   payment/, social/, status/, user/
│   ├── admin/        # Admin-specific components
│   └── [feature]/    # Feature-scoped, lowercase: auth/, checkout/, errorpage/,
│                     #   footer/, header/, hero/, home/, player/, profile/,
│                     #   project/ (+ project/edit/), search/
├── firewall/         # Route access control rules
├── i18n/             # Translations (es/en/ca) + t() store
│   └── locales/      # es.json / en.json / ca.json
├── layouts/          # Astro layout components
├── middleware/       # Astro request middleware
├── openapi/          # OpenAPI SDK — see SDK section below
│   ├── client/       # Generated SDK (do not edit)
│   └── plugins/      # Custom codegen plugins
├── pages/            # Astro routes
│   ├── [...locale]/  # All user-facing pages under locale prefix
│   └── api/          # Server-side API endpoints
├── services/         # Business logic & API call wrappers
├── stores/           # Svelte stores (client-side state)
│   └── drafts/       # Project draft persistence (Dexie/IndexedDB)
├── styles/           # Global CSS
├── types/            # Shared TypeScript interfaces
└── utils/            # Pure helper functions
    └── drafts/       # Draft DB repository helpers
```

Root config files: `astro.config.mjs`, `openapi-ts.config.ts`, `wrangler.toml`, `vitest.config.ts`.

## Conventions

### Naming

| Artifact          | Convention                      | Example                            |
| ----------------- | ------------------------------- | ---------------------------------- |
| Svelte components | `PascalCase.svelte`             | `ProjectCard.svelte`               |
| Services          | `camelCaseService.ts`           | `projectsService.ts`               |
| Stores            | `camelCase.ts`                  | `searchStore.ts`                   |
| Utils             | `camelCase.ts`                  | `cachedFetch.ts`                   |
| Types/interfaces  | `camelCase.ts`                  | `campaign.ts`                      |
| Pages             | kebab-case under `[...locale]/` | `[...locale]/create/project.astro` |

Services export a class **and** a singleton instance:

```typescript
export class ProjectsService { ... }
export const projectsService = new ProjectsService();
```

### Imports

No path aliases — use relative paths:

```typescript
import { apiProjectsGetCollection } from "../openapi/client/sdk.gen";
import type { Project } from "../openapi/client/types.gen";
```

Import sorting is enforced by ESLint (alphabetical). Always separate type imports with `import type`.

### Styling

TailwindCSS utility classes only. Avoid scoped `<style>` blocks and CSS modules unless strictly necessary.

### Design tokens

Defined in `src/styles/global.css` via Tailwind `@theme`. Always use token classes — never hardcode hex values.

**Colors** (hex values in `src/styles/global.css`):

| Token class                                      | Use                           |
| ------------------------------------------------ | ----------------------------- |
| `bg-primary` / `text-primary`                    | Primary brand (teal)          |
| `bg-secondary` / `text-secondary`                | Secondary brand (dark purple) |
| `bg-tertiary` / `text-tertiary`                  | Accent (pink-red)             |
| `bg-content` / `text-content`                    | Body text                     |
| `bg-white` / `text-white`                        | Backgrounds                   |
| `bg-black` / `text-black`                        | Headings                      |
| `bg-grey`                                        | Subtle backgrounds            |
| `bg-purple-soft` / `bg-purple-med`               | Card backgrounds              |
| `bg-variant1..4`                                 | Surface variants              |
| `bg-semantic-error/success/notification/warning` | Semantic states               |

Dark theme tokens apply when `[data-theme="dark"]` is set on a parent element.

**Typography:**

| Token             | Value                           |
| ----------------- | ------------------------------- |
| `font-body`       | Karla (Google Font), sans-serif |
| `text-body-small` | `0.875rem`                      |
| `text-double`     | `2rem`                          |

Body default: `font-body`, `font-weight: 400`, `line-height: 140%`.

**Layout:**

| Class        | Behaviour                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| `.wrapper`   | Max-width 1440px, centered, horizontal padding `10 * --spacing` (responsive: 1rem at ≤768px, 0.5rem at ≤425px) |
| `.no-scroll` | `overflow: hidden`                                                                                             |

### i18n

All user-facing strings via `t()` from `src/i18n/store`. Never hardcode strings visible to users.

**Supported locales:** `es` (default), `en`, `ca`. Keys live in `src/i18n/locales/{es,en,ca}.json` as nested objects.

**In Svelte components** — `t` is a Svelte store; subscribe with `$t`:

```svelte
<script lang="ts">
    import { t } from "../i18n/store";
</script>

<p>{$t("header.search")}</p>
```

**In Astro pages** — `t` is injected as a plain function via `Astro.locals`:

```astro
---
const { t } = Astro.locals;
---

<title>{t("me.page.title")}</title>
```

**Interpolation** — use `{{ varName }}` placeholders in JSON, pass values as second arg:

```typescript
// locales/es.json: { "project.funded": "Financiado al {{ percent }}%" }
$t("project.funded", { percent: 85 }); // → "Financiado al 85%"
```

**HTML content** — escaped by default. Pass `{ allowHTML: true }` to render HTML tags:

```typescript
$t("footer.legal", {}, { allowHTML: true });
```

Missing keys log a console warning and fall back to the key string.

**Add new keys only to `src/i18n/locales/es.json`. Never modify `en.json` or `ca.json` manually — those translations are managed by Crowdin and manual edits will be overwritten.**

### Error handling

Use `AuthErrorType` enum and `createAuthError()` from `src/openapi/api.ts`. Map to user-facing messages with `getErrorTranslationKey(error.type)` + `t()`:

```typescript
import { createAuthError, getErrorTranslationKey } from "../openapi/api";

try { ... } catch (err) {
    const authError = createAuthError(err);
    const message = t(getErrorTranslationKey(authError.type));
}
```

### Formatting

- Prettier: 4-space indent, 100-char line width, Astro + Svelte + TailwindCSS plugins
- ESLint flat config (`eslint.config.js`): TypeScript + Svelte + Cypress rules

## Component library

Before building new UI, check `src/components/library/` and `src/components/icons/`. All components accept a `class` prop merged via `tailwind-merge` for safe overrides.

### `src/components/library/`

Components are organized in category subfolders — import via `library/<category>/<Component>.svelte`:

| Subfolder     | Components                                                                                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `buttons/`    | `Button`, `ActionableButton`, `BackButton`, `ReturnButton`, `ReturnHeader`                                                                                                             |
| `cards/`      | `Card`, `BaseCard`                                                                                                                                                                     |
| `dropdown/`   | `DropdownMenu`, `DropdownItem` (+ `dropdown.types.ts`)                                                                                                                                 |
| `feedback/`   | `Toast`, `Loader`                                                                                                                                                                      |
| `inputs/`     | `TextInput`, `PasswordInput`, `TextArea`, `Select`, `DateInput`, `Checkbox`, `RadioButton`, `RangeSlider`, `Toggle`, `ToggleSwitch`, `CategorySelect`, `Search`, `Email`, `FileUpload` |
| `layout/`     | `Grid`, `AccordionBox`, `CollapsibleBox`, `Carousel`, `Tabs`, `TabNavigation`                                                                                                          |
| `share/`      | `ShareButton`, `CopyUrl`, `Facebook`, `X`, `Iframe`                                                                                                                                    |
| `tags/`       | `Tag`, `Category`                                                                                                                                                                      |
| `theme/`      | `ThemeToggle.astro`                                                                                                                                                                    |
| `typography/` | `BodyText`, `BodyBlog`, `Thtml`                                                                                                                                                        |

Key props of the most used ones:

| Component          | Key props                                                                                                  | Notes                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `Button`           | `size?: "md"\|"sm"`, `kind?: "primary"\|"secondary"\|"ghost"\|"invert"`, `children`                        | Spreads all `HTMLButtonAttributes`                       |
| `ActionableButton` | (see file)                                                                                                 | Button with async action + loading state                 |
| `TextInput`        | `bind:value`, `type?`, `labelText?`, `helperText?`, `error?`, `required?`, `disabled?`                     | Floating label, auto-generated `id`                      |
| `PasswordInput`    | `bind:value`, `labelText?`, `error?`                                                                       | TextInput with show/hide toggle                          |
| `TextArea`         | `id`, `bind:value`, `label?`, `helper?`, `error?: boolean`, `rows?=4`, `disabled?`                         | `error` is a boolean; use `helper` for the error message |
| `Select`           | `bind:value`, `labelText?`, `helperText?`, `error?`, `onChange?`, `onBlur?`, `children` (options)          | Accessible floating label select                         |
| `Tag`              | `variant?: "success"\|"warning"\|"error"\|"bold"`, `children`                                              | Small badge pill                                         |
| `Toast`            | `bind:showToast`, `variant: "error"\|"success"\|"notification"\|"warning"`, `children`, `button?`, `link?` | Self-dismisses on close                                  |
| `Card`             | `children`, `class?`                                                                                       | White rounded card with shadow                           |
| `Grid`             | `children`, `class?`                                                                                       | 2-col mobile → 3-col desktop grid                        |
| `Toggle`           | `onChange?: (value: boolean) => void`                                                                      | Animated toggle, `$bindable` internal state              |

Usage example:

```svelte
import Button from "../library/buttons/Button.svelte"; import TextInput from
"../library/inputs/TextInput.svelte"; import Toast from "../library/feedback/Toast.svelte"; let name
= $state(""); let showError = $state(false);
```

```svelte
<TextInput bind:value={name} labelText="Name" error={nameError} />
<Button kind="primary" onclick={submit}>Save</Button>
<Toast bind:showToast={showError} variant="error">Something went wrong.</Toast>
```

### `src/components/icons/`

Icons are Svelte components accepting `width?`, `height?`, and `class?`. They use `currentColor` — set color via `text-*` class on the icon or a parent. Most icons live in category subfolders — import via `icons/<category>/<Icon>.svelte`:

```svelte
import Chevron from "../icons/navigation/Chevron.svelte"; import Close from
"../icons/navigation/Close.svelte"; import Warning from "../icons/status/Warning.svelte";
```

```svelte
<Chevron direction="down" width="20" height="20" class="text-secondary" />
<Close class="size-5" />
```

`Chevron` accepts `direction?: "left"|"right"|"up"|"down"`.

| Subfolder     | Icons                                                                                                                                                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `actions/`    | `Bookmark`, `Check`, `Copy`, `Download`, `Edit`, `MinusIcon`, `PlusIcon`, `RememberIcon`, `Search`, `Send`, `Share`, `Trash`, `UploadFile`, `UploadIcon`                                                                          |
| `commerce/`   | `Bag`, `Basket`, `BudgetMark`, `CreditCard`, `Money`, `Wallet`                                                                                                                                                                    |
| `filters/`    | `FilterIcon`, `Filters`, `MoreAndLess`, `ShortBy`                                                                                                                                                                                 |
| `media/`      | `Code`, `Eye`, `Flash`, `Image`, `Link`, `Play`, `VideoIcon`, `Web`                                                                                                                                                               |
| `navigation/` | `Arrow`, `ArrowSliderIcon`, `Back`, `Chevron`, `Close`, `CloseMenu`, `Forward`, `Hamburger`, `Home`, `Menu`                                                                                                                       |
| `payment/`    | `CreditCardIcon.astro`, `PaypalIcon.astro`, `StripeIcon.astro`                                                                                                                                                                    |
| `social/`     | `Facebook`, `Gmail`, `Instagram`, `Linkedin`, `MediumIcon`, `Web`, `X` (+ `*Icon` variants, some `.astro`)                                                                                                                        |
| `status/`     | `AlertIcon`, `Error`, `Flames`, `NotificationIcon`, `Ok`, `Spinner`, `SuccessIcon`, `Warning`                                                                                                                                     |
| `user/`       | `Profile`, `User`                                                                                                                                                                                                                 |
| (root)        | `Align`, `Box`, `Bullet`, `Calendar`, `Category`, `Clock`, `Comments`, `DefaultAvatar`, `Goteo`, `Infinity`, `LanguageIcon`, `Languages`, `LineIcon`, `Location`, `Logo`, `Mail`, `PaginationFirst`, `PaginationLast`, `UnitIcon` |

## Svelte 5 runes

This project uses **Svelte 5 runes** syntax. Do not use Svelte 4 patterns (`export let`, `$:`, `onMount`, writable stores for component state).

| Svelte 4 (wrong)       | Svelte 5 runes (correct)        |
| ---------------------- | ------------------------------- |
| `export let prop`      | `let { prop } = $props()`       |
| `let x = 0` (reactive) | `let x = $state(0)`             |
| `$: derived = a + b`   | `let derived = $derived(a + b)` |
| `onMount(() => ...)`   | `$effect(() => ...)`            |
| `<slot />`             | `{@render children()}`          |
| `<slot name="x" />`    | `{@render x()}`                 |

Props with types:

```svelte
<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        label: string;
        children: Snippet;
        onChange?: (value: boolean) => void;
    }

    let { label, children, onChange }: Props = $props();
    let active = $state(false);
    let display = $derived(active ? "on" : "off");
</script>
```

Svelte stores (like `$t` from i18n) are still subscribed with `$storeName` syntax in the template — this is not Svelte 4 reactive syntax, it's the store contract.

## Astro pages vs Svelte components

Use `.astro` for server-rendered pages and layouts (no client-side reactivity needed). Use `.svelte` for interactive components.

To hydrate a Svelte component client-side, use a `client:*` directive:

```astro
<MyComponent client:load />
<!-- hydrate immediately -->
<MyComponent client:idle />
<!-- hydrate when browser is idle -->
<MyComponent client:visible />
<!-- hydrate when enters viewport -->
```

Without a `client:*` directive, a Svelte component renders as static HTML only (no JS sent to browser).

`Astro.locals` is injected by middleware and contains `lang`, `t`, and `session` (if authenticated):

```astro
---
const { lang, t, session } = Astro.locals;
---
```

## Authentication in Astro pages

Session comes from `Astro.locals.session` (set by middleware via `src/auth/session.ts`). Guard protected pages:

```astro
---
import { goto } from "../../utils/navigation";

const { session } = Astro.locals;

if (!session) {
    return goto("/login", { query: { callback: "/me" } });
}

const user = session.user;
const accounting = session.accounting;
---
```

Pass session down to Svelte components as a prop — do not re-fetch it client-side.

**`Session` type** (`src/auth/types.ts`):

```typescript
interface Session {
    token: OAuthToken; // access_token, refresh_token, asHttpHeaders
    user: User; // OpenAPI-generated User type
    accounting: Accounting; // OpenAPI-generated Accounting type
    expires_at: Date; // Auto-refreshed by middleware 5 min before expiry
}
```

`session.token.asHttpHeaders` is a ready-made `{ Authorization: "Bearer ..." }` object for API calls.

## Branch naming

| Prefix    | Use                                                                 |
| --------- | ------------------------------------------------------------------- |
| `feat/`   | New feature                                                         |
| `fix/`    | Bug fix                                                             |
| `hotfix/` | Urgent production fix                                               |
| `chore/`  | Maintenance, deps, config, tooling — no production behaviour change |

Example: `feat/add-project-filters`, `fix/checkout-redirect`, `chore/update-openapi-sdk`.

## `Astro.locals`

Injected by `src/middleware/index.ts` on every request. Available in Astro pages and server actions via `context.locals`:

| Field     | Type                            | Description                                                              |
| --------- | ------------------------------- | ------------------------------------------------------------------------ |
| `lang`    | `Locale` (`"es"\|"en"\|"ca"`)   | Current interface language, derived from user preferences or app default |
| `langs`   | `string[]`                      | Full list of detected user preferred languages                           |
| `t`       | `(key, vars?, opts?) => string` | Translation function for current locale                                  |
| `session` | `Session \| undefined`          | Authenticated session, or `undefined` if not logged in                   |

```astro
---
const { lang, t, session } = Astro.locals;
---
```

In server actions (`src/actions/`): `context.locals.t` and `context.locals.session`.

## `App.svelte` — page shell

`src/layouts/App.svelte` is the interactive page shell. It renders `<Header>`, `<main>`, and `<Footer>` (also in `src/layouts/`), initializes the locale/session Svelte stores, and attaches the browser cache interceptor for the OpenAPI client.

**Always wrap interactive page content with `<App client:load>`:**

```astro
---
import App from "../../layouts/App.svelte";
const { lang, session } = Astro.locals;
---

<Layout title={t("page.title")}>
    <App client:load locale={lang} session={session}>
        <!-- page content here -->
    </App>
</Layout>
```

Props: `locale: Locale`, `session?: Session`, `class?: ClassNameValue`.

Do not add `<Header>` or `<Footer>` manually inside pages — `App` renders them.

## `twMerge` for new components

All library components use `tailwind-merge` for class composition. Replicate the same pattern in new components:

```svelte
<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    interface Props {
        class?: ClassNameValue;
        // ...other props
    }

    let { class: classes = "", ...rest }: Props = $props();
</script>

<div class={twMerge("base-classes-here", classes)}>...</div>
```

This allows callers to safely override or extend styles without class conflicts.

## Key utilities

| Util                     | Import                    | Use                                                                         |
| ------------------------ | ------------------------- | --------------------------------------------------------------------------- |
| `goto(target, options?)` | `src/utils/navigation.ts` | Server-side redirect from Astro pages; returns a `Response`                 |
| `extractId(iri)`         | `src/utils/extractId.ts`  | Extracts numeric id from an API IRI string (e.g. `"/v4/users/42"` → `"42"`) |
| `getBaseUrl()`           | `src/utils/consts.ts`     | Returns `PUBLIC_API_URL` env var (throws if missing)                        |
| `getApiVersion()`        | `src/utils/consts.ts`     | Returns `PUBLIC_API_VERSION` env var                                        |
| `getEnvVar(key)`         | `src/utils/consts.ts`     | Generic env var accessor with throw-on-missing                              |

## Zod validation

Zod is available via `astro/zod` (re-exported by Astro) — do not install a separate `zod` package.

Use it in `src/actions/` to validate action inputs:

```typescript
import { z } from "astro/zod";
import { defineAction, ActionError } from "astro:actions";

export const myAction = defineAction({
    accept: "form",
    input: z.object({
        email: z.string().email(),
        password: z.string().min(8),
    }),
    handler: async (input, context) => {
        const { t } = context.locals;
        // input is fully typed and validated
    },
});
```

Throw `ActionError` with a translated message for user-facing errors:

```typescript
throw new ActionError({
    code: "BAD_REQUEST",
    message: t("register.error.incompleteFields"),
});
```

## Before opening a PR

```bash
pnpm format        # Run Prettier — fix formatting before committing
```

## Testing

```bash
pnpm test          # Vitest unit + component tests
pnpm storybook     # Storybook visual tests (port 6006)
```

Stories live alongside their component (`ComponentName.stories.svelte`). Component tests use Vitest + `@storybook/addon-vitest`.

## Cloudflare Workers constraints

Runtime code (pages, components, services) must not use Node.js-only APIs (`fs`, `path`, `os`, `child_process`, etc.) — they are unavailable in the Cloudflare Workers runtime. Use Web APIs (`fetch`, `crypto`, `URL`, `Cache`) instead.

Build-time code (config files, scripts, plugins) may use Node.js APIs freely.

## SDK (`@hey-api`)

From package `@hey-api/openapi-ts`, using the `@hey-api/client-fetch` for runtime HTTP client.

### Files overview

| File                                        | Edit? | Contents                                                                                                |
| ------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------- |
| `src/openapi/client/sdk.gen.ts`             | No    | Typed API functions — one per API operation                                                             |
| `src/openapi/client/types.gen.ts`           | No    | TypeScript types for all API resources                                                                  |
| `src/openapi/client/operation-paths.gen.ts` | No    | URL path string constants per operation                                                                 |
| `src/openapi/client/client.gen.ts`          | No    | Singleton `client` instance                                                                             |
| `src/openapi/api.ts`                        | Yes   | `createClientConfig` (sets `baseUrl`), `AuthErrorType`, `createAuthError()`, `getErrorTranslationKey()` |
| `src/openapi/cacheFetch.ts`                 | Yes   | Browser Cache API interceptor for GET requests                                                          |
| `src/openapi/plugins/operation-paths/`      | Yes   | Custom codegen plugin for URL path strings                                                              |
| `openapi-ts.config.ts`                      | Yes   | Codegen config — input spec URL, output dir, plugins                                                    |

### Naming convention of generated functions

SDK functions follow the pattern `api{Resource}{Operation}`:

```bash
apiProjectsGetCollection()       → GET  /v4/projects
apiProjectsIdOrSlugGet()         → GET  /v4/projects/{idOrSlug}
apiUsersPost()                   → POST /v4/users
apiUsersIdpersonPatch()          → PATCH /v4/users/{id}/person
```

Path constants (from `operation-paths`) follow the same pattern with `Url` suffix:

```bash
apiProjectsIdOrSlugGetUrl        → '/v4/projects/{idOrSlug}'
apiAccountingsIdGetUrl           → '/v4/accountings/{id}'
```

### Calling an API function

```typescript
import { apiProjectsGetCollection } from "../openapi/client/sdk.gen";
import type { Project } from "../openapi/client/types.gen";

const response = await apiProjectsGetCollection({
    query: { page: 1, itemsPerPage: 20 },
    headers: { "Accept-Language": locale },
});
const projects = (response.data as Project[]) || [];
```

Pass `path`, `query`, `body`, `headers` as named keys. All are typed from the OpenAPI spec.

For authenticated requests, pass the token via `headers`:

```typescript
await apiUsersIdpersonPatch({
    path: { id: userId },
    headers: { ...token.asHttpHeaders },
    body: { firstName: "Ada" },
});
```

### `client.buildUrl()` — construct a URL without fetching

Use when you need the URL string (e.g. for manual `fetch` calls or cache keys):

```typescript
import { client } from "../openapi/client/client.gen";
import { apiProjectsIdOrSlugGetUrl } from "../openapi/client/operation-paths.gen";

const url = client.buildUrl({
    url: apiProjectsIdOrSlugGetUrl,
    path: { idOrSlug: "my-project" },
});
// → "https://api.example.com/v4/projects/my-project"
```

### Request interceptors

The `client` supports request/response interceptors via `client.interceptors.request.use()`. The browser cache interceptor is attached in `App.svelte` on mount:

```typescript
import { createBrowserCacheInterceptor } from "../openapi/cacheFetch";
import { client } from "../openapi/client/client.gen";

onMount(() => {
    client.interceptors.request.use(createBrowserCacheInterceptor());
});
```

The interceptor caches GET responses in the browser Cache API (`"goteo-v4-api"` cache) and handles `ETag`/`Cache-Control`/`Expires` revalidation automatically.

### `src/utils/cachedFetch.ts` — auth-protected persistent cache helpers

Higher-level helpers that use `client.buildUrl()` + a persistent `caches.open()` cache for authenticated IRI fetches. Use these when fetching related resources from an IRI reference:

```typescript
import { fetchProject, fetchUser, fetchAccounting } from "../utils/cachedFetch";

const project = await fetchProject(projectIri, token, "my-cache");
const user = await fetchUser(userIri, token, "my-cache");
```

Available: `fetchProject`, `fetchUser`, `fetchAccounting`, `fetchCheckout`, `fetchTipjar`, `fetchWithPersistentCache<T>` (generic).

### Regenerating the SDK

```bash
pnpm openapi-ts
```

Config in `openapi-ts.config.ts` — fetches the OpenAPI spec from `$PUBLIC_API_URL/$PUBLIC_API_VERSION/docs.json`. Requires the API running and env vars set. Regenerate when the API spec changes; commit generated files together with the config change.

Active plugins: `defaultPlugins`, `operation-paths` (custom), `@hey-api/client-fetch`, `@hey-api/sdk`, `@hey-api/typescript` (enums as JS, `readOnlyWriteOnly` off).

### Key environment variables

| Variable                                      | Purpose                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| `PUBLIC_API_URL`                              | API base URL                                                             |
| `PUBLIC_API_VERSION`                          | API version (currently `"v4"`)                                           |
| `OAUTH2_CLIENT_ID` / `OAUTH2_CLIENT_SECRET`   | OAuth2 credentials (grants: authorization_code, refresh_token, password) |
| `PUBLIC_DEFAULT_LANGUAGE`                     | Default locale (`"es"`, `"en"`, or `"ca"`)                               |
| `PUBLIC_DEFAULT_CURRENCY`                     | Default currency (e.g. `"EUR"`)                                          |
| `PUBLIC_DEFAULT_MAXSIZE`                      | Max upload size in bytes (default `8388608` = 8MB)                       |
| `PUBLIC_TIPPING_TIPJAR_ID`                    | Tipjar ID — leave empty to disable tipping                               |
| `PUBLIC_TIPPING_DEFAULT_AMOUNT`               | Pre-filled tip amount                                                    |
| `PUBLIC_TIPPING_DEFAULT_CHECKED`              | `"true"` to pre-check the tip option                                     |
| `PUBLIC_FACEBOOK_APP_ID`                      | Facebook share dialog app ID                                             |
| `BASIC_AUTH`                                  | `"true"` to enable HTTP Basic auth layer                                 |
| `BASIC_AUTH_USERNAME` / `BASIC_AUTH_PASSWORD` | Credentials for Basic auth                                               |
| `OBJECT_STORAGE_ACCESS_KEY`                   | S3-compatible storage key                                                |
| `OBJECT_STORAGE_SECRET_KEY`                   | S3-compatible storage secret                                             |
| `OBJECT_STORAGE_REGION`                       | Storage region                                                           |
| `OBJECT_STORAGE_ENDPOINT`                     | Storage endpoint URL                                                     |
| `OBJECT_STORAGE_BUCKET`                       | Bucket name                                                              |
| `CLOUDFLARE_INCLUDE_PROCESS_ENV`              | `"true"` — required for Cloudflare Workers to read env vars              |

## Astro actions

Actions live in `src/actions/`. Export all actions from `src/actions/index.ts` under the `server` object:

```typescript
// src/actions/index.ts
export const server = { register, payment };
```

Define actions with `defineAction` + Zod input schema (import Zod from `astro/zod`):

```typescript
import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";

export const myAction = defineAction({
    accept: "form", // or "json"
    input: z.object({ name: z.string() }),
    handler: async (input, context) => {
        const { t, session } = context.locals;
        if (!session)
            throw new ActionError({ code: "UNAUTHORIZED", message: t("errors.unauthorized") });
        return { success: true };
    },
});
```

Call from a Svelte component:

```svelte
<script lang="ts">
    import { actions } from "astro:actions";

    async function handleSubmit(e: SubmitEvent) {
        const form = e.target as HTMLFormElement;
        const { data, error } = await actions.myAction(new FormData(form));
    }
</script>

<form onsubmit|preventDefault={handleSubmit}>...</form>
```

Throw `ActionError` with i18n message for user-facing errors. Available error codes: `"BAD_REQUEST"`, `"UNAUTHORIZED"`, `"FORBIDDEN"`, `"NOT_FOUND"`, `"INTERNAL_SERVER_ERROR"`.

## Image upload

Three-stage flow via internal API endpoints. Use the provided utilities — do not call S3 directly from client code.

**`uploadImage(file, options?)` from `src/utils/imageUpload.ts`:**

```typescript
import { uploadImage } from "../utils/imageUpload";

const result = await uploadImage(file, {
    onProgress: (stage) => console.log(stage), // "preupload" | "uploading" | "postupload"
});
// result: { url: string, key: string }
```

Stages: `preupload` → POST `/api/upload/preupload` gets a signed S3 URL → `uploading` → PUT file directly to S3 → `postupload` → POST `/api/upload/postupload` validates, hashes, moves to public path.

**Svelte wrapper `createImageUploader()` from `src/utils/imageUpload.svelte.ts`** — exposes `$state` for reactive UI:

```svelte
<script lang="ts">
    import { createImageUploader } from "../utils/imageUpload.svelte";
    const uploader = createImageUploader();
</script>

<button onclick={() => uploader.upload(file)} disabled={uploader.uploading}>
    {uploader.uploading ? uploader.stage : "Upload"}
</button>
{#if uploader.error}<p>{uploader.error}</p>{/if}
```

**`FileUpload.svelte` component** (`src/components/library/inputs/FileUpload.svelte`) handles drag-drop UI with validation:

```svelte
<FileUpload bind:files maxSizeMB={8} accept={["image/jpeg", "image/webp", "image/png"]} />
```

## API relay endpoint

`src/pages/api/relay/[...path].ts` is a server-side auth proxy. It adds the Bearer token from the session cookie and forwards requests to the v4 API — use it to make authenticated API calls from client-side code without exposing tokens.

The OpenAPI SDK client already handles auth internally; the relay is for edge cases where you need raw fetch with auth.

## Svelte stores

Client-side state. Subscribe with `$storeName` in templates.

| Store file                               | Key exports                                                                                                                                        | Notes                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/auth/store.ts`                      | `session`                                                                                                                                          | `Session \| undefined`, set by App.svelte                               |
| `src/stores/searchStore.ts`              | `searchFilters`, `searchResults`, `isSearching`, `hasActiveFilters`, `paginationInfo`; `performSearch()`, `updateFilters()`, `loadNextPage()`      | URL sync, debounce, abort                                               |
| `src/stores/cart.ts`                     | `cartCount`, `cartAmount`, `cartByTarget`; `addItem()`, `removeItem()`, `updateQuantity()`, `clear()`, `clearTarget()`                             | `localStorage`, indexed by Accounting IRI + recipient                   |
| `src/stores/wizard-state.ts`             | `isReadyToPublish`, `isCampaignInfoValidStore`; `navigateToStep()`, `initializeFromProject()`, `saveToLocalStorage()`, `restoreFromLocalStorage()` | 5-step wizard, 1s throttle                                              |
| `src/stores/projectCache.ts`             | `add()`, `addMany()`, `get(key)`, `has(key)`, `clear()`                                                                                            | Session-level in-memory cache, indexed by id/slug                       |
| `src/stores/chargesPaginationAndSort.ts` | `itemsPerPage`, `currentPage`, `totalItems`, `isLoading`, `SortOption[]`                                                                           | Admin contributions pagination                                          |
| `src/stores/drafts/projectDraft.ts`      | —                                                                                                                                                  | Dexie (IndexedDB) draft; use `src/utils/drafts/db.ts` + `repository.ts` |

## Additional utilities

| Util                                               | Import                              | Signature                                                                     |
| -------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| `renderMarkdown(text)`                             | `src/utils/renderMarkdown.ts`       | `async (raw: string) => Promise<string>` — HTML output, links open in new tab |
| `formatDate(date, locale)`                         | `src/utils/dates.ts`                | Locale-aware date formatting via `Intl.DateTimeFormat`                        |
| `formatCurrency(value, currency?)`                 | `src/utils/currencies.ts`           | Locale-aware currency via `Intl.NumberFormat`                                 |
| `highlightMatch(text, query, markClass?)`          | `src/utils/highlights.ts`           | Wraps matched chars in `<mark>`, accent-insensitive (NFD)                     |
| `Unauthorized` / `NotFound` / `InternalSeverError` | `src/utils/responses.ts`            | Pre-built `Response` objects for API endpoints                                |
| `uploadToObjectStorage()`                          | `src/utils/objectStorage.ts`        | Server-side S3-compatible upload (Node/Workers build-time only)               |
| `publishProject()`                                 | `src/utils/projectPublisher.ts`     | Submit a project draft to the API for publishing                              |
| `submitProjectData()`                              | `src/utils/projectSubmissionApi.ts` | Low-level API calls for project wizard step submission                        |
| `getTippingConfig()`                               | `src/utils/tipping.ts`              | Read tipping env vars (`PUBLIC_TIPPING_*`) into a typed config object         |
| `budgetColors`                                     | `src/utils/budgetColors.ts`         | Budget bar color palette constants                                            |
| `getCategories()`                                  | `src/utils/categories.ts`           | Fetch + cache project categories from the API                                 |
| `getLang()`                                        | `src/utils/lang.ts`                 | Resolve locale string from URL or Accept-Language                             |

## `Thtml` component

`src/components/library/typography/Thtml.svelte` — renders a translation key that contains HTML. Avoids writing `{@html $t("key", {}, { allowHTML: true })}` inline:

```svelte
<Thtml key="footer.legal" vars={{ year: 2025 }} />
```

## Storybook

Stories use `@storybook/addon-svelte-csf`. File naming: `ComponentName.stories.svelte` alongside the component. Use `defineMeta` + `Story` from `@storybook/addon-svelte-csf`; add `tags: ["autodocs"]` for auto-generated docs. Place stories next to the component file.
