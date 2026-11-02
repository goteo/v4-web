<script lang="ts">
    import AdminSearch from "./Search.svelte";
    import { t } from "../../i18n/store";
    import Bullet from "../icons/Bullet.svelte";
    import FiltersIcon from "../icons/filters/Filters.svelte";
    import ActionableButton from "../library/buttons/ActionableButton.svelte";
    import Button from "../library/buttons/Button.svelte";
    import FilterComposer from "../library/filters/FilterComposer.svelte";

    import type { FilterResource } from "../../utils/filterComposer";

    const APPLY_AUTORESET_MS = 2000;

    let {
        resource,
        filters,
        onApplyFilters,
        searchPlaceholder,
        onSelectTarget,
        onSelectProject,
        onSelectUser,
    }: {
        resource: FilterResource;
        filters: any;
        onApplyFilters: (filters: any) => Promise<void> | void;
        searchPlaceholder?: string;
        onSelectTarget?: (accounting: string) => void;
        onSelectProject?: (project: any) => void;
        onSelectUser?: (user: any) => void;
    } = $props();

    let showFilterComposer = $state(false);
    let composerParams = $state<Record<string, string | string[]>>({});
    let previousComposerKeys = $state<string[]>([]);
    let previousComposerParams = $state("");

    function handleComposerParamsChange(params: Record<string, string | string[]>) {
        composerParams = params;
    }

    async function applyComposerFilters() {
        const result = { ...filters };
        const allComposerKeys = new Set([...previousComposerKeys, ...Object.keys(composerParams)]);

        for (const key of allComposerKeys) {
            result[key] = undefined;
        }
        for (const [key, value] of Object.entries(composerParams)) {
            result[key] = value;
        }

        previousComposerKeys = Object.keys(composerParams);

        await onApplyFilters(result);
    }

    function hasActiveFilters() {
        if (!filters) return false;
        const keys = Object.keys(filters);
        return keys.some((k) => filters[k] !== undefined && filters[k] !== "");
    }

    let autoApplyTimeout: ReturnType<typeof setTimeout>;

    function scheduleApply() {
        clearTimeout(autoApplyTimeout);
        autoApplyTimeout = setTimeout(applyComposerFilters, 400);
    }

    $effect(() => {
        const serialized = JSON.stringify(composerParams);
        if (previousComposerParams && serialized !== previousComposerParams) {
            scheduleApply();
        }
        previousComposerParams = serialized;
    });
</script>

<div
    class="border-variant1 relative flex flex-col rounded-[40px] border bg-white p-8 shadow-[0px_1px_3px_0px_#0000001A]"
>
    <div class="flex items-center gap-4">
        {#if onSelectTarget || onSelectProject || onSelectUser}
            <AdminSearch
                {searchPlaceholder}
                {onSelectTarget}
                {onSelectProject}
                {onSelectUser}
                {resource}
            />
        {/if}

        <Button
            type="button"
            kind="ghost"
            onclick={() => (showFilterComposer = !showFilterComposer)}
            class="shrink-0 text-nowrap"
        >
            <span class="relative">
                <FiltersIcon />
                {#if hasActiveFilters()}
                    <Bullet class="absolute top-0 right-0" size={6} />
                {/if}
            </span>
            {#if showFilterComposer}
                {$t("pages.admin.filter.btns.closeFilters")}
            {:else}
                {$t("pages.admin.filter.btns.openFilters")}
            {/if}
        </Button>
    </div>

    <div class="filter-panel" class:open={showFilterComposer}>
        <div class="filter-panel-inner">
            <div class="flex flex-col gap-4 pt-5">
                <FilterComposer {resource} onParamsChange={handleComposerParamsChange} />

                <div class="flex justify-end">
                    <ActionableButton
                        type="button"
                        kind="primary"
                        class="w-fit"
                        action={applyComposerFilters}
                        autoreset={APPLY_AUTORESET_MS}
                    >
                        {$t("pages.admin.filter.btns.apply")}
                    </ActionableButton>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .filter-panel {
        display: grid;
        grid-template-rows: 0fr;
        overflow: hidden;
        transition: grid-template-rows 0.25s ease;
    }

    .filter-panel.open {
        grid-template-rows: 1fr;
        overflow: visible;
    }

    .filter-panel-inner {
        min-height: 0;
        overflow: visible;
    }
</style>
