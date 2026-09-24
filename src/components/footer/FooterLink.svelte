<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import type { Snippet } from "svelte";

    interface Props {
        href: string;
        class?: ClassNameValue;
        children: Snippet;
    }

    let { href, class: customClass = "", children }: Props = $props();
</script>

<a
    {href}
    class={twMerge(
        "text-variant1 hover:text-purple-soft focus:ring-purple-soft focus:ring-offset-secondary rounded-sm transition-colors duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none",
        customClass,
    )}
>
    {@render children()}
</a>
