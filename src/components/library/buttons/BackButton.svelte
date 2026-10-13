<script lang="ts">
    import { twMerge } from "tailwind-merge";

    import { t } from "../../../i18n/store";

    import type { Snippet } from "svelte";
    import type { ClassNameValue } from "tailwind-merge";

    let {
        href,
        children,
        class: classes = "",
    }: { href?: string; children?: Snippet; class?: ClassNameValue } = $props();
</script>

<button
    onclick={() => (href ? (window.location.href = href) : history.back())}
    class={twMerge(
        "group text-content flex w-fit cursor-pointer items-center gap-2 transition-colors duration-200 hover:text-black",
        classes,
    )}
>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M12 3.75C7.44365 3.75 3.75 7.44365 3.75 12C3.75 16.5563 7.44365 20.25 12 20.25C16.5563 20.25 20.25 16.5563 20.25 12C20.25 7.44365 16.5563 3.75 12 3.75ZM2.25 12C2.25 6.61522 6.61522 2.25 12 2.25C17.3848 2.25 21.75 6.61522 21.75 12C21.75 17.3848 17.3848 21.75 12 21.75C6.61522 21.75 2.25 17.3848 2.25 12ZM11.7803 8.46967C12.0732 8.76256 12.0732 9.23744 11.7803 9.53033L10.0607 11.25H15.75C16.1642 11.25 16.5 11.5858 16.5 12C16.5 12.4142 16.1642 12.75 15.75 12.75H10.0607L11.7803 14.4697C12.0732 14.7626 12.0732 15.2374 11.7803 15.5303C11.4874 15.8232 11.0126 15.8232 10.7197 15.5303L7.71967 12.5303C7.42678 12.2374 7.42678 11.7626 7.71967 11.4697L10.7197 8.46967C11.0126 8.17678 11.4874 8.17678 11.7803 8.46967Z"
            fill="#462949"
        ></path>
    </svg>
    <span class="font-medium">
        {#if children}
            {@render children()}
        {:else}
            {$t("common.back")}
        {/if}
    </span>
</button>
