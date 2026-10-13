<script lang="ts">
    import { onMount, type Snippet } from "svelte";
    import { get } from "svelte/store";
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import AdminHeader from "./AdminHeader.svelte";
    import Footer from "./Footer.svelte";
    import Header from "./Header.svelte";
    import HeaderSubmenu from "./HeaderSubmenu.svelte";
    import MeHeader from "./MeHeader.svelte";
    import { session } from "../auth/store";
    import { locale } from "../i18n/store";
    import { CACHE_NAME } from "../openapi/cacheFetch";
    import { initCacheInterceptor } from "../openapi/cacheInterceptor";
    import { client } from "../openapi/client/client.gen";

    import type { Session } from "../auth/types";
    import type { Locale } from "../i18n/locales";

    interface AppState {
        locale: Locale;
        session?: Session;
        children?: Snippet;
        class?: ClassNameValue;
        admin?: boolean;
        /**
         * Header of the signed-in promoter area. Mutually exclusive with `admin`: the two are
         * separate dashboards and the admin one wins if a page ever asks for both.
         */
        me?: boolean;
    }

    let {
        locale: localeProp,
        session: sessionProp,
        children,
        class: classes,
        admin = false,
        me = false,
    }: AppState = $props();

    const HAD_SESSION_KEY = "goteo-had-session";

    /**
     * Drops the API cache once a visit stops being signed in.
     *
     * Logging out happens on the server — `logout/index.astro` clears the cookie and
     * redirects — so nothing there can reach Cache Storage, which is a browser API. Watching
     * the transition from here catches the same moment, and covers an expired session or a
     * failed refresh too, not only an explicit logout.
     *
     * The flag has to survive the reload that logging out causes, hence `localStorage`
     * rather than a variable. Purging only on the transition keeps anonymous visits from
     * clearing the cache they just filled.
     *
     * Authenticated responses no longer reach this cache at all (see `cacheFetch.ts`), so
     * nothing here races a read: this is about not leaving one reader's data on the disk of
     * a browser somebody else also uses.
     */
    async function rememberSessionPresence(current: Session | undefined) {
        try {
            if (current) {
                localStorage.setItem(HAD_SESSION_KEY, "1");
                return;
            }

            if (!localStorage.getItem(HAD_SESSION_KEY)) return;

            localStorage.removeItem(HAD_SESSION_KEY);

            if (typeof caches !== "undefined") {
                await caches.delete(CACHE_NAME);
            }
        } catch (e) {
            console.error("Session cache cleanup failed:", e);
        }
    }

    /**
     * Loads the session from the API instead of receiving it as a prop.
     *
     * Props of a hydrated island are serialized into the HTML document, so passing the
     * session down that way would write the access and refresh tokens into every page.
     * Pages that can be cached must not carry them, and fetch them from here instead.
     */
    async function loadSession() {
        try {
            const response = await fetch("/api/session");

            if (!response.ok) return;

            const data = (await response.json()) as Session | null;
            const current = data ? { ...data, expires_at: new Date(data.expires_at) } : undefined;

            session.set(current);
            await rememberSessionPresence(current);
        } catch (e) {
            console.error("Session fetch failed:", e);
        }
    }

    onMount(() => {
        client.interceptors.request.use(async (request) => {
            try {
                const currentSession = get(session);
                if (currentSession?.token?.asHttpHeaders) {
                    const headers = currentSession.token.asHttpHeaders as Record<string, string>;
                    for (const [key, value] of Object.entries(headers)) {
                        if (value && !request.headers.has(key)) {
                            request.headers.set(key, String(value));
                        }
                    }
                }
            } catch (e) {
                console.error("Auth interceptor failed:", e);
            }
            return request;
        });

        initCacheInterceptor();

        if (sessionProp) {
            session.set(sessionProp);
            rememberSessionPresence(sessionProp);
            return;
        }

        loadSession();
    });

    $effect(() => {
        locale.set(localeProp);
    });
</script>

{#if admin}
    <AdminHeader />
{:else if me}
    <MeHeader />
{:else}
    <Header>
        <HeaderSubmenu />
    </Header>
{/if}
<main
    class={twMerge(
        "mt-(--sticky-top) flex w-full max-w-screen flex-1 flex-col lg:max-h-none",
        classes,
    )}
>
    {@render children?.()}
</main>
<Footer />
