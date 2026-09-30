<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import Bookmark from "../../icons/actions/Bookmark.svelte";
    import Close from "../../icons/navigation/Close.svelte";
    import ErrorIcon from "../../icons/status/Error.svelte";
    import NotificationIcon from "../../icons/status/NotificationIcon.svelte";
    import WarningIcon from "../../icons/status/Warning.svelte";

    import type { Snippet } from "svelte";

    let {
        variant = "error",
        button,
        link,
        class: classes = "",
        floating,
        showToast = $bindable(false),
        children,
    }: {
        variant: keyof typeof variantStyles;
        button?: Snippet;
        link?: Snippet;
        class?: ClassNameValue;
        floating?: boolean;
        showToast: boolean;
        children: Snippet;
    } = $props();

    const variantStyles = {
        error: "border-tertiary bg-semantic-error",
        success: "border-primary bg-semantic-success",
        notification: "border-variant3 bg-semantic-notification",
        warning: "border-variant4 bg-semantic-warning",
    };
</script>

{#if showToast}
    <div
        role={variant === "error" ? "alert" : "status"}
        class={twMerge(
            "flex max-w-360 min-w-67.5 items-start gap-4 self-center rounded-lg border p-6 text-wrap sm:items-center sm:justify-between",
            floating &&
                "fixed right-4 bottom-4 left-4 z-999 shadow-lg sm:right-6 sm:bottom-6 sm:left-auto sm:max-w-120",
            variantStyles[variant],
            classes,
        )}
    >
        <div class="flex items-start justify-center gap-4 sm:items-center">
            {#if variant === "error"}
                <ErrorIcon class="size-5 shrink-0 sm:size-6" />
            {:else if variant === "success"}
                <Bookmark check class="size-5 shrink-0 sm:size-6" />
            {:else if variant === "notification"}
                <NotificationIcon class="size-5 shrink-0 sm:size-6" />
            {:else if variant === "warning"}
                <WarningIcon class="size-5 shrink-0 sm:size-6" />
            {/if}
            {#if children}
                <p class="text-sm leading-6 font-normal text-[#000]">
                    {@render children()}
                </p>
            {/if}
        </div>
        <div class="flex items-start gap-4 sm:items-center">
            {#if button || link}
                <div class="hidden sm:flex">
                    {@render button?.()}
                    {@render link?.()}
                </div>
            {/if}
            <button
                onclick={() => (showToast = false)}
                aria-label="Close"
                class="flex h-6 w-6 cursor-pointer items-center justify-center"
            >
                <Close></Close>
            </button>
        </div>
        {#if button || link}
            <div class="mt-6 flex items-center justify-center sm:hidden">
                {@render button?.()}
                {@render link?.()}
            </div>
        {/if}
    </div>
{/if}
