<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import type { Snippet } from "svelte";
    import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";

    const sizeStyles = {
        md: "px-8 py-4 rounded-3xl",
        sm: "px-4 py-2 rounded-2xl",
    };

    const kindStyles = {
        primary: "bg-primary",
        secondary: "bg-variant1",
        ghost: "inset-ring-1 inset-ring-secondary",
        invert: "",
    };

    interface Props extends Omit<HTMLButtonAttributes, "class"> {
        children: Snippet;
        href?: HTMLAnchorAttributes["href"];
        class?: ClassNameValue;
        size?: keyof typeof sizeStyles;
        kind?: keyof typeof kindStyles;
    }

    let {
        children,
        href,
        type = "button",
        disabled = false,
        class: classes = "",
        size = "md",
        kind = "primary",
        ...rest
    }: Props = $props();

    const anchorProps = rest as HTMLAnchorAttributes;
    const buttonProps = rest as HTMLButtonAttributes;

    const buttonClass = $derived(
        twMerge(
            "text-secondary disabled:bg-grey flex w-auto items-center justify-center gap-2 font-bold transition hover:cursor-pointer",
            sizeStyles[size],
            kindStyles[kind],
            href && "hover:underline",
            classes,
        ),
    );
</script>

{#if href}
    <a {href} class={buttonClass} {...anchorProps}>
        {@render children()}
    </a>
{:else}
    <button {type} {disabled} class={buttonClass} {...buttonProps}>
        {@render children()}
    </button>
{/if}
