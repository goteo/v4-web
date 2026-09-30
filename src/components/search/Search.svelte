<!--
Project search section: filters and results.
Owns the search state and keeps it in sync with the URL query string.
-->
<script lang="ts">
    import { onMount, untrack } from "svelte";

    import LoadingSpinner from "./LoadingSpinner.svelte";
    import LoadMoreButton from "./LoadMoreButton.svelte";
    import SearchErrorAlert from "./SearchErrorAlert.svelte";
    import SearchFilters from "./SearchFilters.svelte";
    import { locale, t } from "../../i18n/store";
    import { createAuthError, getErrorTranslationKey } from "../../openapi/api";
    import { apiProjectsGetCollection } from "../../openapi/client/sdk.gen";
    import { getCollectionTotalItems, toCollectionItems } from "../../utils/hydra";
    import { constrainToPublicStatuses } from "../../utils/projectStatus";
    import { transformProjectsToCampaigns } from "../../utils/projectTransform";
    import { toSearchParams } from "../../utils/searchParams";
    import CampaignCard from "../home/CampaignCard.svelte";
    import SearchIcon from "../icons/actions/Search.svelte";
    import Button from "../library/buttons/Button.svelte";
    import Grid from "../library/layout/Grid.svelte";

    import type { Project } from "../../openapi/client/types.gen";
    import type { Campaign } from "../../types/campaign";
    import type { SearchFilters as Filters } from "../../utils/searchParams";

    interface Props {
        initialFilters?: Filters;
    }

    let { initialFilters = {} }: Props = $props();

    const ITEMS_PER_PAGE = 18;
    const SEARCH_DEBOUNCE_MS = 400;

    let filters = $state<Filters>(untrack(() => initialFilters));
    let campaigns = $state<Campaign[]>([]);
    let totalItems = $state(0);
    let page = $state(1);
    let isLoading = $state(false);
    let isLoadingMore = $state(false);
    let error = $state<string | null>(null);
    let hasSearched = $state(false);

    let hasNextPage = $derived(campaigns.length < totalItems);
    let isEmpty = $derived(hasSearched && campaigns.length === 0);

    let abortController: AbortController | undefined;
    let searchTimeout: ReturnType<typeof setTimeout> | undefined;

    async function fetchPage(pageToFetch: number, append: boolean) {
        abortController?.abort();
        const controller = new AbortController();
        abortController = controller;

        isLoading = true;
        isLoadingMore = append;
        error = null;

        try {
            const { status, "status[]": statuses, ...rest } = filters;

            const { data, error: apiError } = await apiProjectsGetCollection({
                query: {
                    ...rest,
                    "status[]": constrainToPublicStatuses([
                        ...(statuses ?? []),
                        ...(status ? [status] : []),
                    ]),
                    page: pageToFetch,
                    itemsPerPage: ITEMS_PER_PAGE,
                },
                headers: { Accept: "application/ld+json", "Accept-Language": $locale },
                signal: controller.signal,
            });
            if (apiError) throw apiError;

            const projects = toCollectionItems<Project>(data);
            const loaded = await transformProjectsToCampaigns(projects);
            if (controller.signal.aborted) return;

            campaigns = append ? [...campaigns, ...loaded] : loaded;
            totalItems = getCollectionTotalItems(data);
            page = pageToFetch;
            hasSearched = true;
        } catch (err) {
            if (controller.signal.aborted) return;
            console.error(err);
            error = $t(getErrorTranslationKey(createAuthError(err).type));
        } finally {
            if (abortController === controller) {
                isLoading = false;
                isLoadingMore = false;
            }
        }
    }

    function search() {
        clearTimeout(searchTimeout);
        return fetchPage(1, false);
    }

    function loadMore() {
        if (!hasNextPage || isLoading) return;
        return fetchPage(page + 1, true);
    }

    function updateUrl() {
        const params = toSearchParams(filters).toString();
        const url = params ? `${window.location.pathname}?${params}` : window.location.pathname;
        window.history.replaceState({}, "", url);
    }

    function updateFilters(newFilters: Partial<Filters>) {
        filters = { ...filters, ...newFilters };
        updateUrl();
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(search, SEARCH_DEBOUNCE_MS);
    }

    function clearFilters() {
        filters = {};
        updateUrl();
        search();
    }

    onMount(() => {
        search();
        return () => {
            clearTimeout(searchTimeout);
            abortController?.abort();
        };
    });
</script>

<div class="mb-8">
    <SearchFilters {filters} onChange={updateFilters} onSearch={search} />
</div>

<div class="mb-8" role="region" aria-label={$t("pages.search.results.regionLabel")}>
    <!-- Screen reader announcements -->
    <div class="sr-only" aria-live="polite" aria-atomic="true" data-testid="search-announcer">
        {#if hasSearched && !isLoading && campaigns.length > 0}
            {$t("pages.search.accessibility.resultsFound", { count: totalItems })}
        {/if}
    </div>

    {#if error}
        <div class="mb-6">
            <SearchErrorAlert {error} onRetry={search} />
        </div>
    {/if}

    <div data-testid="search-results">
        <!-- Initial loading state (only when no results exist yet) -->
        {#if !hasSearched || (isLoading && campaigns.length === 0)}
            <div class="py-12 text-center" data-testid="loading-spinner">
                <LoadingSpinner />
            </div>
        {/if}

        <!-- Results grid (kept visible during load more) -->
        {#if campaigns.length > 0}
            <div class="relative">
                <!-- Overlay spinner while re-searching, not on load more -->
                {#if isLoading && !isLoadingMore}
                    <div
                        class="absolute inset-0 z-10 flex items-start justify-center rounded-2xl bg-white/60 pt-12 backdrop-blur-[1px]"
                        data-testid="results-loading-overlay"
                    >
                        <LoadingSpinner />
                    </div>
                {/if}
                <Grid class="auto-rows-fr grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {#each campaigns as campaign (campaign.id)}
                        <div data-campaign-id={campaign.id}>
                            <CampaignCard size={campaign.size!} {campaign} />
                        </div>
                    {/each}
                </Grid>
            </div>

            <div class="mt-8">
                <LoadMoreButton
                    onLoadMore={loadMore}
                    {isLoading}
                    hasMore={hasNextPage}
                    loadedCount={campaigns.length}
                />
            </div>
        {/if}
    </div>

    {#if isEmpty && !isLoading}
        <div class="flex flex-col items-center py-12 text-center" data-testid="search-empty">
            <SearchIcon class="mb-4 h-16 w-16 text-gray-400" />
            <span class="mb-2 text-xl font-semibold text-gray-900">
                {$t("pages.search.empty.title")}
            </span>
            <p class="mb-6 text-gray-600">
                {$t("pages.search.empty.description")}
            </p>
            <Button onclick={clearFilters}>
                {$t("pages.search.empty.clearFilters")}
            </Button>
        </div>
    {/if}
</div>
