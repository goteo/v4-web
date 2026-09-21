# Goteo v4 Web

Frontend for the [Goteo](https://goteo.org) crowdfunding platform — built on Astro 7 + Svelte 5 + TailwindCSS 4, deployed on Cloudflare Workers.

> **NOTE**: This application is a client of the [Goteo v4 API](https://github.com/goteo/org.goteo.api). You need a running v4 API instance and an OAuth client registered in it before this web app will work.

## Installation

This application requires [Node.js](https://nodejs.org/en/download) (v22.12 or later) and the [pnpm](https://pnpm.io/installation) package manager. It also needs a reachable [Goteo v4 API](https://github.com/goteo/org.goteo.api) instance to connect to.

### 1. Clone or download this repository.

```shell
git clone https://github.com/goteo/org.goteo.www
cd org.goteo.www
```

### 2. Install the dependencies.

```shell
pnpm install
```

### 3. Configure the environment.

Copy the example environment file and fill in the values for your setup.

```shell
cp .env.example .env
```

The minimum required values to boot the app and authenticate users are:

| Variable                                    | Description                                                                                                                   |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_API_URL`                            | Base URL of your Goteo v4 API instance (e.g. `http://localhost:8090`)                                                         |
| `PUBLIC_API_VERSION`                        | API version — keep as `v4`                                                                                                    |
| `OAUTH2_CLIENT_ID` / `OAUTH2_CLIENT_SECRET` | Credentials of an OAuth client registered in the API. Must allow the grants `authorization_code`, `refresh_token`, `password` |

> NOTE: The OAuth client must exist **in the v4 API instance**. See the API's [Authentication docs](https://api.v4.goteo.org/v4#section/Authentication).

The remaining variables (tipping, Facebook share, object storage, HTTP Basic auth) are **optional** and the app falls back to sane defaults when they are empty. See [`.env.example`](.env.example) for the full annotated list and the [Environment variables](#environment-variables) section below.

## Usage

Start the development server.

```shell
pnpm dev
```

The app should be live at [http://localhost:4321](http://localhost:4321).

The dev server runs on the Cloudflare Workers runtime (`workerd`), the same one used in production, with bindings read from [`wrangler.toml`](wrangler.toml). No separate command is needed to reproduce the production runtime locally.

### Other commands

| Command                | Action                                           |
| :--------------------- | :----------------------------------------------- |
| `pnpm install`         | Install dependencies                             |
| `pnpm dev`             | Dev server at `localhost:4321` (Workers runtime) |
| `pnpm build`           | Build for production                             |
| `pnpm preview`         | Preview production build locally                 |
| `pnpm format`          | ESLint fix + Prettier write                      |
| `pnpm check`           | Prettier format check                            |
| `pnpm openapi`         | Regenerate OpenAPI SDK from live API spec        |
| `pnpm storybook`       | Storybook dev server at `localhost:6006`         |
| `pnpm build-storybook` | Build Storybook static output                    |

### Regenerating the API SDK

The TypeScript API client under `src/openapi/client/` is generated from the live API's OpenAPI spec. Regenerate it whenever the API spec changes (requires the API running and `PUBLIC_API_URL` / `PUBLIC_API_VERSION` set):

```shell
pnpm openapi
```

This fetches the spec from `$PUBLIC_API_URL/$PUBLIC_API_VERSION/docs.json`. Commit the generated files together with any config change.

## Testing

Component and unit tests run on [Vitest](https://vitest.dev/) through the Storybook test addon — launch Storybook to develop and visually check components:

```shell
pnpm storybook
```

## Before opening a PR

```shell
pnpm format         # Fix formatting (ESLint + Prettier)
```

## Debugging

Common issues you might run into while developing:

### 1. Blank pages or auth failures right after setup.

This almost always means the app cannot reach the API or the OAuth client is misconfigured. Check that:

- `PUBLIC_API_URL` points to a reachable v4 API instance and includes the protocol (`http://` / `https://`).
- An OAuth client exists **in that API instance** and its `OAUTH2_CLIENT_ID` / `OAUTH2_CLIENT_SECRET` match your `.env`.
- The OAuth client allows the `authorization_code`, `refresh_token` and `password` grants.

### 2. Type errors against the API after the API changed.

The generated SDK is out of date. Regenerate it (API must be running):

```shell
pnpm openapi
```

### 3. Errors about missing Node.js modules (`fs`, `path`, `os`, `child_process`, …).

The dev server and production both run on the Cloudflare Workers runtime, which has no Node.js APIs. Runtime code (pages, components, services) must use Web APIs (`fetch`, `crypto`, `URL`, `Cache`) instead. Move any Node-only logic to build-time code (config files, scripts, plugins), where it is still allowed.

---

## Stack

| Layer      | Technology                                  |
| ---------- | ------------------------------------------- |
| Framework  | Astro 7                                     |
| UI         | Svelte 5 (runes), TailwindCSS 4             |
| Language   | TypeScript 5                                |
| Runtime    | Cloudflare Workers (also supports Node)     |
| API client | `@hey-api/client-fetch` (generated OpenAPI) |
| Testing    | Vitest (unit), Cypress (E2E), Storybook     |

## Routes

All user-facing pages live under `src/pages/[...locale]/` (locale prefix: `es`, `en`, `ca`).

| Route                      | Page                       |
| -------------------------- | -------------------------- |
| `/`                        | Home                       |
| `/search`                  | Project search             |
| `/project/[idOrSlug]`      | Project detail             |
| `/project/[idOrSlug]/edit` | Project editor (auth)      |
| `/create/project`          | Create project (auth)      |
| `/checkout`                | Checkout cart              |
| `/checkout/payment`        | Payment                    |
| `/checkout/post-payment`   | Post-payment confirmation  |
| `/checkout/verify`         | Payment verification       |
| `/checkout/wallet`         | Wallet confirmation        |
| `/login`                   | Login                      |
| `/login/callback`          | OAuth2 callback            |
| `/logout`                  | Logout                     |
| `/register`                | Register                   |
| `/me`                      | My profile (auth)          |
| `/user/[idOrHandle]`       | Public user profile        |
| `/about`                   | About                      |
| `/static/[fileName]`       | CMS static content         |
| `/admin/charges`           | Admin contributions (auth) |
| `/403`, `/404`, `/500`     | Error pages                |

API endpoints under `src/pages/api/`:

| Endpoint                 | Purpose                      |
| ------------------------ | ---------------------------- |
| `/api/relay/[...path]`   | Authenticated API proxy      |
| `/api/upload/preupload`  | S3 pre-signed URL generation |
| `/api/upload/postupload` | S3 post-upload validation    |

## Project Structure

```
src/
├── actions/          # Astro server actions (form mutations)
├── auth/             # JWT sessions, OAuth2 tokens, refresh logic
├── components/       # Svelte components (PascalCase filenames)
│   ├── library/      # Reusable UI primitives + Storybook stories
│   ├── Admin/        # Admin-specific components
│   ├── icons/        # Icon SVG components
│   └── [Feature]/    # Feature-scoped (project/, profile/, Checkout/, etc.)
├── firewall/         # Route access control rules
├── i18n/             # Translations (es/en/ca) + t() store
├── layouts/          # Astro layout components
├── middleware/       # Astro request middleware (auth, locale, firewall)
├── openapi/          # OpenAPI SDK (generated) + config
├── pages/            # Astro routes
│   ├── [...locale]/  # All user-facing pages under locale prefix
│   └── api/          # Server-side API endpoints
├── services/         # Business logic & API call wrappers
├── stores/           # Svelte stores (client-side state)
│   └── drafts/       # Project draft persistence (Dexie/IndexedDB)
├── stories/          # Full-page Storybook stories
├── styles/           # Global CSS + Tailwind theme tokens
├── svgs/             # SVG Svelte components
├── types/            # Shared TypeScript interfaces
└── utils/            # Pure helper functions
    └── drafts/       # Draft DB repository helpers
```

## Environment variables

Full list lives in [`.env.example`](.env.example). Grouped by purpose:

| Variable                                      | Required | Purpose                                                                               |
| --------------------------------------------- | :------: | ------------------------------------------------------------------------------------- |
| `PUBLIC_API_URL`                              |    ✅    | Base URL of the v4 API instance                                                       |
| `PUBLIC_API_VERSION`                          |    ✅    | API version (`v4`)                                                                    |
| `OAUTH2_CLIENT_ID` / `OAUTH2_CLIENT_SECRET`   |    ✅    | OAuth client credentials registered in the API                                        |
| `PUBLIC_DEFAULT_CURRENCY`                     |          | Fallback currency (e.g. `EUR`)                                                        |
| `PUBLIC_DEFAULT_LANGUAGE`                     |          | Fallback locale (`es`, `en`, `ca`)                                                    |
| `PUBLIC_DEFAULT_COUNTRY`                      |          | Fallback ISO 3166-1 alpha-2 country (default `ES`), e.g. preselected tax id country   |
| `PUBLIC_DEFAULT_MAXSIZE`                      |          | Max upload size in bytes (default `8388608` = 8MB)                                    |
| `PUBLIC_TIPPING_TIPJAR_ID`                    |          | Tipjar ID — leave empty to disable tipping                                            |
| `PUBLIC_TIPPING_DEFAULT_AMOUNT`               |          | Pre-filled tip amount                                                                 |
| `PUBLIC_TIPPING_DEFAULT_CHECKED`              |          | `"true"` to pre-check the tip option                                                  |
| `PUBLIC_FACEBOOK_APP_ID`                      |          | Facebook share dialog app ID                                                          |
| `CLOUDFLARE_INCLUDE_PROCESS_ENV`              |          | `"true"` — required for Cloudflare Workers to read env vars                           |
| `BASIC_AUTH`                                  |          | `"true"` to add an HTTP Basic auth layer (not a replacement for OAuth)                |
| `BASIC_AUTH_USERNAME` / `BASIC_AUTH_PASSWORD` |          | Credentials for the Basic auth layer                                                  |
| `OBJECT_STORAGE_*`                            |          | S3-compatible storage (access key, secret, region, endpoint, bucket) for media upload |

## CI / Deployment

| Workflow             | Trigger           | Action                            |
| -------------------- | ----------------- | --------------------------------- |
| `deploy.yml`         | Push to `main`    | Deploy to Cloudflare (production) |
| `deploy.yml`         | Push to `develop` | Deploy to Cloudflare (staging)    |
| `prettier-check.yml` | PR / push         | Prettier format check             |
