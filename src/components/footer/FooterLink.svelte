<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import type { Snippet } from "svelte";

    interface Props {
        href: string;
        class?: ClassNameValue;
        children: Snippet;
    }

    let { href, class: customClass = "", children }: Props = $props();

    const defaultClasses =
        "text-variant1 hover:text-purple-soft focus:ring-purple-soft focus:ring-offset-secondary rounded-sm transition-colors duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none";

    const external = $derived(href.startsWith("http"));
</script>

<a
    {href}
    class={twMerge(defaultClasses, customClass)}
    target={external ? "_blank" : undefined}
    rel={external ? "noopener noreferrer" : undefined}
>
    {@render children()}
</a>
