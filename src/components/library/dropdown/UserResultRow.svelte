<!--
    @component
    One user rendered as a search/dropdown result row: small avatar on the
    left (the Header pattern, falling back to the user icon when the user has
    no photo) and two lines on the right — display name over `@handle`.

    Admins (or any caller forcing `showEmail`) additionally reveal the user's
    email on hover/focus through an inline tooltip; for anyone else the email
    never reaches the DOM. The row itself is presentational: wrap it in a
    button/link when the context needs to select or navigate.
-->
<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import { session } from "../../../auth/store";
    import { highlightMatch } from "../../../utils/highlights";
    import UserIcon from "../../icons/user/User.svelte";

    import type { User } from "../../../openapi/client";

    interface Props {
        user: User;
        class?: ClassNameValue;
        /** Wrap query matches in <mark> inside the display name. */
        highlightQuery?: string;
        /** Forces the email tooltip; `undefined` falls back to the session's admin role. */
        showEmail?: boolean;
    }

    let {
        user,
        class: classes = undefined,
        highlightQuery = "",
        showEmail = undefined,
    }: Props = $props();

    const isAdmin = $derived($session?.user.roles?.includes("ROLE_ADMIN") ?? false);
    const canSeeEmail = $derived(showEmail ?? isAdmin);

    const name = $derived(user.displayName ?? user.handle ?? "");
    const shownName = $derived(highlightQuery ? highlightMatch(name, highlightQuery) : name);
</script>

<div class={twMerge("group relative flex min-w-0 items-center gap-3", classes)}>
    {#if user.avatar}
        <img src={user.avatar} alt="" class="size-8 shrink-0 rounded-full object-cover" />
    {:else}
        <UserIcon class="size-8 shrink-0" />
    {/if}

    <div class="flex min-w-0 flex-col">
        <span class="text-secondary truncate text-sm font-bold">
            {#if highlightQuery}
                {@html shownName}
            {:else}
                {shownName}
            {/if}
        </span>
        <span class="text-content truncate text-xs">@{user.handle}</span>
    </div>

    {#if canSeeEmail && user.email}
        <span
            class="bg-gray-800/90 pointer-events-none absolute top-1/2 right-0 z-50 max-w-[70%] -translate-y-1/2 truncate rounded px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
        >
            {user.email}
        </span>
    {/if}
</div>
