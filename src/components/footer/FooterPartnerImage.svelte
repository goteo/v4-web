<script lang="ts">
    import { twMerge } from "tailwind-merge";

    import type { ClassNameValue } from "tailwind-merge";

    const sizeStyles = {
        small: "h-8 sm:h-10 md:h-12",
        medium: "h-10 sm:h-12 md:h-14",
    };

    let {
        src,
        alt,
        href,
        hrefAriaLabel,
        size = "small",
        class: customClass = "",
    }: {
        src: string;
        alt: string;
        href?: string;
        hrefAriaLabel?: string;
        size?: keyof typeof sizeStyles;
        class?: ClassNameValue;
    } = $props();

    const external = $derived(!!href && href.startsWith("http"));
</script>

{#snippet image()}
    <img
        {src}
        {alt}
        loading="lazy"
        class={twMerge("w-auto transition-opacity hover:opacity-90", sizeStyles[size], customClass)}
    />
{/snippet}

{#if href}
    <a
        {href}
        class="focus:ring-purple-soft focus:ring-offset-purple-soft rounded-lg focus:ring-2 focus:ring-offset-2 focus:outline-none"
        aria-label={hrefAriaLabel}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
    >
        {@render image()}
    </a>
{:else}
    {@render image()}
{/if}
