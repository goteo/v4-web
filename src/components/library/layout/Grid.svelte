<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import type { Snippet } from "svelte";

    interface Props {
        class?: ClassNameValue;
        children: Snippet;
    }

    let { class: classes = "", children }: Props = $props();
</script>

<div class={twMerge("grid grid-cols-2 gap-6 lg:grid-cols-3", classes)}>
    {@render children()}
</div>
