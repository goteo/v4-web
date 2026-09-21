<script lang="ts">
    import ExportCsv from "./ExportCsv.svelte";
    import Filters from "./Filters.svelte";
    import FiltersTags from "./FiltersTags.svelte";
    import Slider from "./Slider.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { FilterResource } from "../../utils/filterComposer";
    import type { Snippet } from "svelte";

    interface FiltersConfig {
        resource: FilterResource;
        filters: any;
        onApplyFilters: (filters: any) => Promise<void> | void;
        searchPlaceholder?: string;
        onSelectTarget?: (accounting: string) => void;
        onSelectProject?: (project: any) => void;
        onSelectUser?: (user: any) => void;
    }

    interface FilterTagsConfig {
        title: string;
        filters: any;
        onCloseFilter: (filters: any) => void;
        resource: FilterResource;
    }

    interface CsvConfig {
        endpoint: string;
        filenamePrefix: string;
        queryParams: any;
        totalItems: number;
    }

    interface SliderConfig {
        slides: { title: string; amount: number | string }[];
        isLoading: boolean;
    }

    let {
        title,
        description,
        filters,
        filterTags,
        csv,
        slider,
        actions,
        children,
    }: {
        title: string;
        description?: string;
        filters: FiltersConfig;
        filterTags: FilterTagsConfig;
        csv: CsvConfig;
        slider: SliderConfig;
        actions?: Snippet;
        children?: Snippet;
    } = $props();
</script>

<div class="wrapper">
    <div class="flex w-full flex-col gap-10 py-10">
        <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div class="flex flex-col gap-4">
                <Title level={2} variant="headline" weight="bold" color="default">
                    {title}
                </Title>
                {#if description}
                    <p class="text-content">{description}</p>
                {/if}
            </div>
            {#if actions}
                <div class="flex shrink-0 items-center gap-2">
                    {@render actions()}
                </div>
            {/if}
        </header>

        <Filters
            resource={filters.resource}
            filters={filters.filters}
            onApplyFilters={filters.onApplyFilters}
            searchPlaceholder={filters.searchPlaceholder}
            onSelectTarget={filters.onSelectTarget}
            onSelectProject={filters.onSelectProject}
            onSelectUser={filters.onSelectUser}
        />

        <div class="flex flex-col">
            <div class="mb-8 flex flex-wrap justify-between gap-4">
                <FiltersTags
                    title={filterTags.title}
                    filters={filterTags.filters}
                    onCloseFilter={filterTags.onCloseFilter}
                    resource={filterTags.resource}
                />
                <ExportCsv
                    endpoint={csv.endpoint}
                    queryParams={csv.queryParams}
                    filenamePrefix={csv.filenamePrefix}
                    totalItems={csv.totalItems}
                />
            </div>
            <Slider slides={slider.slides} isLoading={slider.isLoading} />
        </div>

        {@render children?.()}
    </div>
</div>
