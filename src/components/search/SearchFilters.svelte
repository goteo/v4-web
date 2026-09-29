<!--
Search Filters Container Component
Main container that composes all filter subcomponents
Implements responsive layout matching Figma design with collapsible mobile behavior
-->
<script lang="ts">
    import CategoryFilter from "./CategoryFilter.svelte";
    import SearchButton from "./SearchButton.svelte";
    import SearchInput from "./SearchInput.svelte";
    import StatusFilter from "./StatusFilter.svelte";
    import { t } from "../../i18n/store";
    import FilterIcon from "../icons/filters/FilterIcon.svelte";
    import Button from "../library/buttons/Button.svelte";
    import TerritoryInput from "../library/inputs/TerritoryInput.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { SearchFilters } from "../../utils/searchParams";

    interface Props {
        filters: SearchFilters;
        onChange: (filters: Partial<SearchFilters>) => void;
        onSearch: () => void;
    }

    let { filters, onChange, onSearch }: Props = $props();

    // Filter visibility (collapsed by default on all devices)
    let filtersOpen = $state(false);

    function toggleFilters() {
        filtersOpen = !filtersOpen;
    }
</script>

<div
    class="border-grey mx-auto flex w-80 flex-col gap-4 rounded-3xl border bg-white px-4 py-4 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] min-[500px]:mx-auto min-[500px]:w-auto min-[500px]:max-w-6xl lg:gap-6 lg:rounded-4xl lg:px-6 lg:py-5"
    data-testid="search-filters"
>
    <div
        class="flex flex-col gap-3 min-[500px]:flex-row min-[500px]:items-center min-[500px]:gap-6"
    >
        <!-- Search section with input and button -->
        <div class="flex flex-1 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
            <!-- Search input -->
            <div class="min-w-0 flex-1">
                <SearchInput
                    value={filters.title}
                    onSearch={(title) => onChange({ title })}
                    onEnter={onSearch}
                    onClear={onSearch}
                    data-testid="search-input"
                />
            </div>

            <!-- Search button -->
            <SearchButton
                variant="secondary"
                onclick={onSearch}
                data-testid="search-btn"
                class="w-full shrink-0 sm:w-auto"
            >
                {$t("pages.search.input.button")}
            </SearchButton>
        </div>

        <!-- Filter toggle button - full width on mobile, auto on desktop -->
        <Button
            kind="ghost"
            onclick={toggleFilters}
            class="w-full justify-center min-[500px]:w-auto"
        >
            <FilterIcon width="16" height="16" class="mr-2" />
            {filtersOpen ? $t("pages.search.filters.close") : $t("pages.search.filters.show")}
        </Button>
    </div>

    <!-- Expanded filters section (collapsed by default).-->
    {#if filtersOpen}
        <div class="flex flex-col gap-4 lg:gap-6">
            <!-- Status + territory filters -->
            <div class="flex flex-col items-start gap-6 lg:flex-row">
                <div class="w-full">
                    <Title level={3} variant="field" class="font-body mb-2">
                        {$t("pages.search.filters.status.label")}
                    </Title>
                    <StatusFilter
                        statuses={filters["status[]"] || []}
                        onStatusesChange={(statuses) => onChange({ "status[]": statuses })}
                    />
                </div>
                <div class="w-full">
                    <Title level={3} variant="field" class="font-body mb-2">
                        {$t("pages.search.filters.territoryLabel")}
                    </Title>
                    <TerritoryInput
                        multiple
                        selectedTerritory={{
                            countries: filters["territory.country[]"] || [],
                            subLvl1: filters["territory.subLvl1[]"] || [],
                            subLvl2: filters["territory.subLvl2[]"] || [],
                        }}
                        onTerritoryChange={(territories) =>
                            onChange({
                                "territory.country[]": territories.countries,
                                "territory.subLvl1[]": territories.subLvl1,
                                "territory.subLvl2[]": territories.subLvl2,
                            })}
                    />
                </div>
            </div>

            <!-- Category filters -->
            <div class="w-full">
                <CategoryFilter
                    selectedCategories={filters["categories[]"] || []}
                    onCategoryChange={(categories) => onChange({ "categories[]": categories })}
                />
            </div>
        </div>
    {/if}
</div>
