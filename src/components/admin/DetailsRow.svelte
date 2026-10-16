<script lang="ts">
    import type { Snippet } from "svelte";

    export interface DetailsField {
        label: string;
        value?: string | number;
        /** Custom content painted instead of `value`, for fields that are not plain text. */
        snippet?: Snippet;
    }

    let {
        fields,
        columns = 2,
        children,
        actions,
        footer,
    }: {
        fields?: DetailsField[];
        columns?: 1 | 2 | 3 | 4;
        children?: Snippet;
        actions?: Snippet;
        footer?: Snippet;
    } = $props();

    const gridClass = $derived(
        columns === 1
            ? "grid-cols-1"
            : columns === 3
              ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
              : columns === 4
                ? "grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 xl:grid-cols-4"
                : "grid-cols-1 sm:grid-cols-2",
    );
</script>

<section class="flex flex-col gap-10 px-10 py-8">
    {#if children}
        {@render children()}
    {:else if fields && fields.length > 0}
        <div class="text-content grid gap-x-10 gap-y-8 text-base leading-5 {gridClass}">
            {#each fields as field (field.label)}
                <div class="flex min-w-0 flex-col gap-2">
                    <p class="font-bold">{field.label}</p>
                    {#if field.snippet}
                        {@render field.snippet()}
                    {:else}
                        <span class="truncate" title={String(field.value ?? "")}>
                            {field.value ?? "—"}
                        </span>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    {#if actions}
        {@render actions()}
    {/if}

    {#if footer}
        {@render footer()}
    {/if}
</section>
