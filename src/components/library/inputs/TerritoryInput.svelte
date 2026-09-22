<script lang="ts">
    import ResourceSearch from "./ResourceSearch.svelte";
    import { extractTerritory, type NominatimResult } from "../../../services/nominatim";
    import { searchTerritories, toTerritories, type Territories } from "../../../utils/searchers";

    import type { Territory } from "../../../openapi/client";
    import type { SearchResultItem } from "../../../utils/resourceSearch";
    import type { ClassNameValue } from "tailwind-merge";

    interface Props {
        class?: ClassNameValue;
        value?: string;
        placeholder?: string;
        helperText?: string;
        error?: string;
        onInput?: (territory: Territory) => void;
        onBlur?: () => void;
        multiple?: boolean;
        selectedTerritory?: Territories;
        onTerritoryChange?: (territories: Territories) => void;
    }

    let {
        class: classes = undefined,
        value = $bindable(""),
        placeholder,
        helperText,
        error = undefined,
        onInput = undefined,
        onBlur = undefined,
        multiple = false,
        selectedTerritory = undefined,
        onTerritoryChange = undefined,
    }: Props = $props();

    let selected = $state<SearchResultItem[]>([]);

    let lastIncoming = "";

    // Hydrate the chips from the territory codes the parent already holds.
    $effect(() => {
        if (!multiple || !selectedTerritory) return;

        const codes = [
            ...(selectedTerritory.countries || []),
            ...(selectedTerritory.subLvl1 || []),
            ...(selectedTerritory.subLvl2 || []),
        ].filter(Boolean);

        const signature = [...codes].sort().join("|");
        if (signature === lastIncoming) return;
        lastIncoming = signature;

        if (codes.length === 0) {
            selected = [];
            return;
        }

        (async () => {
            const resolved = await Promise.all(codes.map((code) => searchTerritories(code)));
            selected = resolved.map(([first]) => first).filter(Boolean);
        })();
    });

    function handleChange(items: SearchResultItem[]) {
        if (!multiple) return;
        onTerritoryChange?.(toTerritories(items as SearchResultItem<NominatimResult>[]));
    }

    function handleSelect(item: SearchResultItem) {
        const place = (item as SearchResultItem<NominatimResult>).raw;
        if (multiple || !place) return;
        onInput?.(extractTerritory(place));
    }

    function handleClear() {
        if (multiple) {
            onTerritoryChange?.({ countries: [], subLvl1: [], subLvl2: [] });
            return;
        }

        onInput?.({ country: null, subLvl1: null, subLvl2: null, address: null });
    }
</script>

<ResourceSearch
    class={classes}
    search={searchTerritories}
    {multiple}
    bind:value
    bind:selected
    {placeholder}
    {helperText}
    {error}
    onSelect={handleSelect}
    onChange={handleChange}
    onClear={handleClear}
    onBlur={() => onBlur?.()}
/>
