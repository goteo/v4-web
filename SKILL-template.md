---
name: org.goteo.www
description: Provides a web GUI to interact with the Goteo v4 API and adds tools for implementing the crowdfunding platform Goteo as an open-core application. Use it when writing or reviewing source code for the Goteo v4 web.
---

# Goteo v4 Web Codebase Reference

## Stack

Astro 7 + Svelte 5 + TailwindCSS 4 + TypeScript 5, deployed on Cloudflare Workers. Requires Node 22.12+. Always use `pnpm` (never npm/npx/yarn).

`svelte.config.js` only sets `preprocess: vitePreprocess()` — Astro reads its Svelte config from `astro.config.mjs`, but `svelte-check` reads this file, so it must stay in sync.

Cloudflare D1 database: migrations in `db/migrations/`, seed in `db/seed.sql`. Locally: `pnpm db:migrate`, `pnpm db:seed`. `deploy:*` scripts apply remote migrations before deploying.

## Where new code goes

| Folder              | Contents                                                                  |
| ------------------- | ------------------------------------------------------------------------- |
| `src/repositories/` | Persistence: drafts (Dexie/IndexedDB), banners, highlights, homeHero (D1) |
| `src/services/`     | Business logic & API call wrappers                                        |
| `src/utils/`        | Helper functions (`checkouts/`, `media/` subfolders)                      |
| `src/validation/`   | Project/reward/collab/register validators                                 |
| `src/stores/`       | Svelte stores (client-side state)                                         |
| `src/actions/`      | Astro server actions                                                      |

## Conventions

### Naming

| Artifact          | Convention                      | Example                            |
| ----------------- | ------------------------------- | ---------------------------------- |
| Svelte components | `PascalCase.svelte`             | `ProjectCard.svelte`               |
| Services          | `camelCaseService.ts`           | `projectsService.ts`               |
| Stores            | `camelCase.ts`                  | `searchStore.ts`                   |
| Utils             | `camelCase.ts`                  | `extractId.ts`                     |
| Types/interfaces  | `camelCase.ts`                  | `campaign.ts`                      |
| Pages             | kebab-case under `[...locale]/` | `[...locale]/create/project.astro` |

Services export a class **and** a singleton instance:

```typescript
export class ProjectsService { ... }
export const projectsService = new ProjectsService();
```

### Imports

No path aliases — use relative paths. Import sorting is enforced by ESLint (alphabetical). Always separate type imports with `import type`.

### Styling

TailwindCSS utility classes only. Avoid scoped `<style>` blocks and CSS modules unless strictly necessary.

### Design tokens

Defined in `src/styles/global.css` via Tailwind `@theme`. Always use token classes — never hardcode hex values.

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

Dark theme tokens apply when `[data-theme="dark"]` is set on a parent element. Layout container: `.wrapper` (max-width 1440px, responsive padding).

### i18n

All user-facing strings via `t()` — never hardcode visible strings. Locales: `es` (default), `en`, `ca`.

- Svelte: `import { t } from "../i18n/store"` → `{$t("header.search")}`
- Astro / actions: `const { t } = Astro.locals` / `context.locals.t`
- Interpolation: `{{ varName }}` in JSON → `$t("key", { varName: 1 })`
- HTML keys: `<Thtml key="footer.legal" vars={{ year: 2025 }} />` (`library/typography/Thtml.svelte`)

**`$t` on the server always renders the default locale (es).** The locale store is only set client-side in `App.svelte`, so a Svelte component rendered without a `client:*` directive shows Spanish on `/en` and `/ca`. If it uses `$t`, keep a `client:*` directive or pass translated strings as props from the `.astro` parent via `Astro.locals.t`.

**Add new keys only to `src/i18n/locales/es.json`. Never modify `en.json` or `ca.json` — they are managed by Crowdin and manual edits will be overwritten.**

### Error handling

```typescript
import { createAuthError, getErrorTranslationKey } from "../openapi/api";

try { ... } catch (err) {
    const authError = createAuthError(err);
    const message = t(getErrorTranslationKey(authError.type));
}
```

### Formatting

Prettier: 4-space indent, 100-char line width. ESLint flat config (`eslint.config.js`).

## Component library

Before building new UI, check `src/components/library/` and `src/components/icons/` (icons use `currentColor`; `Chevron` takes `direction`). Import via `library/<category>/<Component>.svelte`.

| Subfolder      | Components                                                                                                                                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `buttons/`     | `Button`, `ActionableButton`, `BackButton`, `ReturnButton`, `ReturnHeader`, `PaginationNavButton`                                                                                                                                                               |
| `cards/`       | `Card`, `BaseCard`, `Reward`                                                                                                                                                                                                                                    |
| `dropdown/`    | `DropdownMenu`, `DropdownItem`                                                                                                                                                                                                                                  |
| `feedback/`    | `Toast`, `Loader`, `DeleteModal`                                                                                                                                                                                                                                |
| `filters/`     | `FilterComposer`, `FilterComposerRow`, `TerritoryReferentInput`                                                                                                                                                                                                 |
| `inputs/`      | `TextInput`, `PasswordInput`, `TextArea`, `Select`, `DateInput`, `Checkbox`, `RadioButton`, `RangeSlider`, `Toggle`, `ToggleSwitch`, `CategorySelect`, `Search`, `Email`, `FileUpload`, `ImageUploadModal`, `CurrencyInput`, `RichTextEditor`, `TerritoryInput` |
| `layout/`      | `Grid`, `AccordionBox`, `CollapsibleBox`, `Carousel`, `Tabs`, `TabNavigation`                                                                                                                                                                                   |
| `paginations/` | `Pagination`                                                                                                                                                                                                                                                    |
| `share/`       | `ShareButton`, `CopyUrl`, `Facebook`, `X`, `Iframe`                                                                                                                                                                                                             |
| `tables/`      | `DataTable`                                                                                                                                                                                                                                                     |
| `tags/`        | `Tag`, `Category`, `AccountingOwnerBadge`                                                                                                                                                                                                                       |
| `theme/`       | `ThemeToggle.astro`                                                                                                                                                                                                                                             |
| `typography/`  | `BodyText`, `BodyBlog`, `Title`, `Thtml`                                                                                                                                                                                                                        |

Text inputs share `labelText`, `helperText` and `error?: string` — `error` is the message, not a boolean.

### `twMerge` for new components

All library components accept a `class` prop merged with `tailwind-merge`. Replicate it:

```svelte
<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    interface Props {
        class?: ClassNameValue;
    }

    let { class: classes = "", ...rest }: Props = $props();
</script>

<div class={twMerge("base-classes-here", classes)}>...</div>
```

## Svelte 5 runes

Do not use Svelte 4 patterns.

| Svelte 4 (wrong)            | Svelte 5 runes (correct)                        |
| --------------------------- | ----------------------------------------------- |
| `export let prop`           | `let { prop } = $props()`                       |
| `let x = 0` (reactive)      | `let x = $state(0)`                             |
| `$: derived = a + b`        | `let derived = $derived(a + b)`                 |
| `$: { sideEffect() }`       | `$effect(() => { sideEffect() })`               |
| `on:click={fn}`             | `onclick={fn}`                                  |
| `on:submit\|preventDefault` | `onsubmit={(e) => { e.preventDefault(); ... }}` |
| `<slot />`                  | `{@render children()}`                          |
| `<slot name="x" />`         | `{@render x()}`                                 |

`onMount` is still valid for run-once setup; prefer `$effect` when the code depends on reactive state. Stores (like `$t`) are still subscribed with `$storeName`.

## Pages, `App.svelte` and session

`Astro.locals` (set by `src/middleware/index.ts`): `lang`, `langs` (Accept-Language prefs), `t`, `session` (`undefined` if logged out). Same fields in actions via `context.locals`.

**Always wrap interactive page content with `<App client:load>`** (`src/layouts/App.svelte`). It renders `<Header>` and `<Footer>` — do not add them manually — and attaches the OpenAPI client interceptors (auth headers + browser cache).

```astro
---
const { lang, t, session } = Astro.locals;
if (!session) return goto("/login", { query: { callback: "/me" } });
---

<Layout title={t("page.title")}>
    <App client:load locale={lang} session={session}>...</App>
</Layout>
```

`session` is optional on `<App>`: without it, `App` fetches it from `/api/session` after hydration. **Pages edge-cached via `cacheableRoutes` in `astro.config.mjs` (home, about, project, user, static) are served to every visitor, so they must not pass `session` or render any per-visitor content.** On other pages, pass it as a prop rather than re-fetching. `session.token.asHttpHeaders` is a ready-made `{ Authorization: "Bearer ..." }` for server-side API calls.

Route access by role is declared in `ACL` in `src/firewall/access-control.ts` (path regex → roles, e.g. `/admin` → `ROLE_ADMIN`). A new route that needs login or a role must be added there.

`src/pages/api/relay/[...path].ts` is a server-side auth proxy for edge cases needing raw `fetch` with auth.

## Zod validation

Import Zod from the `zod` package, not from `astro/zod`. Both resolve to the same installed copy, so the choice is about who owns the version: `zod` is a declared dependency of this project, while `astro/zod` follows whatever Astro depends on internally — it moved from v3 to v4 in an Astro upgrade with no signal.

Keep the `zod` range aligned with Astro's when bumping majors, so pnpm keeps deduplicating to one copy instead of bundling two.

Register new actions in the `server` object of `src/actions/index.ts`. Throw `ActionError` with a translated message for user-facing errors.

## SDK (`@hey-api`)

Generated in `src/openapi/client/` — do not edit. Regenerate with `pnpm sdk` (needs the API running and env vars set); commit generated files together with the config change.

Functions follow `api{Resource}{Operation}` (e.g. `apiProjectsIdOrSlugGet`, `apiUsersIdpersonPatch`); path constants add a `Url` suffix in `operation-paths.gen.ts`.

The browser cache interceptor is only active when `PUBLIC_CSCACHE="true"`, caches anonymous GETs only, and is purged when a session ends. To force a fresh read (e.g. right after a mutation):

```typescript
import { withoutCache } from "../openapi/cacheInterceptor";

const project = await withoutCache(() => apiProjectsIdOrSlugGet({ path: { idOrSlug } }));
```

## Key utilities

Reuse these instead of reimplementing:

| Util                               | Import                        | Use                                                                 |
| ---------------------------------- | ----------------------------- | ------------------------------------------------------------------- |
| `goto(target, options?)`           | `src/utils/navigation.ts`     | Server-side redirect from Astro pages; returns a `Response`         |
| `toCollectionItems<T>(collection)` | `src/utils/hydra.ts`          | Items of a Hydra collection response — don't read `.member` by hand |
| `extractId(iri)`                   | `src/utils/extractId.ts`      | `"/v4/users/42"` → `"42"`                                           |
| `formatCurrency(money, options?)`  | `src/utils/currencies.ts`     | Locale-aware formatting of a `Money` object                         |
| `sumMoney` / `multiplyMoney`       | `src/utils/money.ts`          | `Money` arithmetic                                                  |
| `renderMarkdown(text)`             | `src/utils/renderMarkdown.ts` | Markdown → HTML, links open in new tab                              |
| `getBaseUrl()` / `getEnvVar(key)`  | `src/utils/consts.ts`         | Env var access, throws if missing                                   |

## Image upload

Never call S3 from client code. Use `uploadImage(file, { onProgress })` from `src/utils/media/imageUpload.ts` (or `createImageUploader()` from `imageUpload.svelte.ts` for reactive `$state`). Flow: `/api/upload/preupload` (signed URL) → PUT to S3 → `/api/upload/postupload` (validate, hash, move to public path).

## Environment variables

Full list in `.env.example`. Non-obvious ones:

- `CLOUDFLARE_INCLUDE_PROCESS_ENV="true"` — required for Cloudflare Workers to read env vars.
- `PUBLIC_CSCACHE="true"` — enables the browser cache interceptor.

## Cloudflare Workers constraints

Runtime code (pages, components, services) must not use Node.js-only APIs (`fs`, `path`, `os`, `child_process`, etc.). Use Web APIs (`fetch`, `crypto`, `URL`, `Cache`) instead. Build-time code (config files, scripts, plugins) may use Node.js APIs freely.

A Content Security Policy is set in `astro.config.mjs` (`security.csp`, applies to build/preview only, not `astro dev`). A new external host for `fetch`, scripts or iframes must be added there or the browser blocks it.

## Branch naming

| Prefix    | Use                                                                 |
| --------- | ------------------------------------------------------------------- |
| `feat/`   | New feature                                                         |
| `fix/`    | Bug fix                                                             |
| `hotfix/` | Urgent production fix                                               |
| `chore/`  | Maintenance, deps, config, tooling — no production behaviour change |

## Before opening a PR

```bash
pnpm format        # ESLint --fix + Prettier
pnpm check:astro   # astro check — .astro files (+ .ts)
pnpm check:svelte  # svelte-check — .svelte files (+ .ts)
```

`pnpm check` is Prettier only, not a type check. ESLint does not type-check. Neither type check passes on a clean tree, so they are not CI gates — grep the output for the files you touched. `check:types` runs both but stops at the first failure.

## Debugging

`astro dev` runs in `workerd`, and not all Worker logs reach the terminal. The inspector is pinned to port `9229` (`inspectorPort` in `astro.config.mjs`); attach with VS Code **F5 → Attach to Worker** (`.vscode/launch.json`) or open `http://localhost:4321/__debug`. Only one client at a time. Details: `docs/worker-debugging.md`.

## Testing

No `pnpm test` script. Vitest runs through `@storybook/addon-vitest` (`pnpm exec vitest`). `pnpm storybook` runs on port 6006. Stories live next to the component as `ComponentName.stories.svelte`, using `defineMeta` + `Story` from `@storybook/addon-svelte-csf` with `tags: ["autodocs"]`.
