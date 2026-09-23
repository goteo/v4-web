<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        onClick,
        disabled,
        ariaLabel,
        children,
    }: {
        onClick: () => void;
        disabled: boolean;
        ariaLabel: string;
        children: Snippet;
    } = $props();
</script>

<button
    onclick={onClick}
    {disabled}
    aria-label={ariaLabel}
    class="border-variant1 text-secondary hover:border-secondary hover:bg-purple-soft disabled:border-content/24 disabled:text-content/24 hover:disabled:border-content/24 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border disabled:cursor-not-allowed hover:disabled:bg-transparent"
>
    {@render children()}
</button>
