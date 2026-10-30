<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import type { Snippet } from "svelte";

    interface Props {
        variant?: keyof typeof variantStyles;
        class?: ClassNameValue;
        children: Snippet;
    }

    let { variant, class: classes = "", children }: Props = $props();

    const variantStyles = {
        success: "bg-variant2",
        warning: "bg-variant4",
        error: "bg-tertiary text-white",
        bold: "bg-grey border-grey text-secondary font-bold border-purple-soft",
    };
</script>

<div
    class={twMerge(
        "text-body-small flex h-fit items-center justify-center gap-2 rounded-sm bg-white px-2 py-1 whitespace-nowrap text-black",
        variant ? variantStyles[variant] : "",
        classes,
    )}
>
    {@render children()}
</div>
