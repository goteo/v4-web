<script lang="ts">
    import { t } from "../../../i18n/store";
    import Chevron from "../../icons/navigation/Chevron.svelte";
    import PaginationNavButton from "../buttons/PaginationNavButton.svelte";

    let {
        currentPage: currentPageProp = 1,
        totalItems: totalItemsProp = 0,
        itemsPerPage: itemsPerPageProp = 10,
        isLoading = false,
        onPageChange,
    } = $props<{
        currentPage?: number;
        totalItems?: number;
        itemsPerPage?: number;
        isLoading?: boolean;
        onPageChange?: (page: number) => void;
    }>();

    const totalPages = $derived(Math.max(1, Math.ceil(totalItemsProp / itemsPerPageProp)));
    const page = $derived(Math.min(Math.max(1, currentPageProp), totalPages));
    const firstItem = $derived(totalItemsProp === 0 ? 0 : (page - 1) * itemsPerPageProp + 1);
    const lastItem = $derived(Math.min(page * itemsPerPageProp, totalItemsProp));
    const shownItems = $derived(Math.max(0, lastItem - firstItem + 1));

    function goToPage(p: number) {
        if (isLoading) return;
        if (p < 1 || p > totalPages) return;
        if (p === page) return;
        onPageChange?.(p);
    }

    /** `null` = puntos suspensivos. */
    const visiblePages = $derived.by((): (number | null)[] => {
        const tp = totalPages;

        if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1);

        const siblingCount = 1;
        const left = page - siblingCount;
        const right = page + siblingCount;
        const pages: (number | null)[] = [1];

        if (left > 2) pages.push(null);
        for (let i = Math.max(2, left); i <= Math.min(tp - 1, right); i++) pages.push(i);
        if (right < tp - 1) pages.push(null);
        pages.push(tp);

        return pages;
    });
</script>

<section class="flex flex-wrap items-center justify-between gap-4">
    {#if totalPages > 1}
        <div class="overflow-x-auto">
            <nav
                class="flex w-max items-center gap-1"
                aria-label={$t("domain.pagination.label")}
                aria-busy={isLoading}
            >
                <PaginationNavButton
                    onClick={() => goToPage(page - 1)}
                    disabled={isLoading || page === 1}
                    ariaLabel={$t("domain.pagination.previous")}
                >
                    <Chevron direction="left" width="16" height="16" />
                </PaginationNavButton>

                {#each visiblePages as p, i (i)}
                    {#if p === null}
                        <span class="text-secondary w-10 shrink-0 text-center">…</span>
                    {:else}
                        <button
                            onclick={() => goToPage(p)}
                            disabled={isLoading}
                            aria-current={page === p ? "page" : undefined}
                            aria-label={$t("domain.pagination.page", { page: p })}
                            class="disabled:border-content/24 disabled:text-content/24 flex h-10 w-fit min-w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border px-4 text-base leading-6 font-normal disabled:cursor-not-allowed hover:disabled:bg-transparent"
                            class:bg-secondary={page === p}
                            class:text-primary={page === p}
                            class:border-secondary={page === p}
                            class:text-secondary={page !== p}
                            class:border-variant1={page !== p}
                            class:hover:bg-purple-soft={page !== p}
                            class:hover:border-secondary={page !== p}
                        >
                            {p}
                        </button>
                    {/if}
                {/each}

                <PaginationNavButton
                    onClick={() => goToPage(page + 1)}
                    disabled={isLoading || page === totalPages}
                    ariaLabel={$t("domain.pagination.next")}
                >
                    <Chevron direction="right" width="16" height="16" />
                </PaginationNavButton>
            </nav>
        </div>
    {/if}
    {#if totalItemsProp > 0}
        <span class="text-content text-sm font-bold">
            {$t("domain.pagination.showing", {
                from: firstItem,
                to: lastItem,
                items: shownItems,
                total: totalItemsProp,
            })}
        </span>
    {:else if !isLoading}
        <span class="text-content text-sm font-bold">
            {$t("domain.pagination.noResults")}
        </span>
    {:else}
        <span class="text-content text-sm font-bold">
            {$t("domain.pagination.unloaded")}
        </span>
    {/if}
</section>
