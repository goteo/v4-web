<script lang="ts" module>
    export type Territories = {
        countries: string[];
        subLvl1: string[];
        subLvl2: string[];
    };
</script>

<script lang="ts">
    import { twJoin, twMerge, type ClassNameValue } from "tailwind-merge";

    import {
        searchPlace,
        extractTerritory,
        type NominatimResult,
    } from "../../../services/nominatim";
    import { debounce } from "../../../utils/debounce";
    import DropdownMenu from "../dropdown/DropdownMenu.svelte";

    import type { Territory } from "../../../openapi/client";
    import type { DropdownOption } from "../dropdown/dropdown.types";

    interface TerritoryOption extends DropdownOption {
        result: NominatimResult;
    }

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

    let options: TerritoryOption[] = $state([]);
    let selected: TerritoryOption[] = $state([]);

    let lastIncoming = "";

    $effect(() => {
        if (!multiple || !selectedTerritory) return;

        const all = [
            ...(selectedTerritory.countries || []),
            ...(selectedTerritory.subLvl1 || []),
            ...(selectedTerritory.subLvl2 || []),
        ].filter(Boolean);

        const signature = [...all].sort().join("|");

        if (signature === lastIncoming) return;

        lastIncoming = signature;

        if (all.length === 0) {
            selected = [];
            return;
        }

        (async () => {
            const results = await Promise.all(
                all.map((code) => searchPlace(code, 1).then((r) => r?.[0])),
            );

            selected = results.filter(Boolean).map((result) => ({
                id: result.osm_id.toString(),
                label: result.display_name,
                selected: true,
                result,
            }));
        })();
    });

    const searchPlaces = debounce(async (searchText: string) => {
        const selectedIds = new Set(selected.map((s) => s.id));
        const results = await searchPlace(searchText, 6);

        options = results.map((result) => ({
            id: result.osm_id.toString(),
            label: result.display_name,
            selected: selectedIds.has(result.osm_id.toString()),
            result,
        }));
    });

    function handleSearch(searchText: string) {
        if (!searchText || searchText.length < 2) {
            searchPlaces.cancel();
            options = multiple ? [...selected] : [];
            return;
        }

        searchPlaces(searchText);
    }

    function handleChange(option: DropdownOption) {
        if (!multiple) {
            const result = (option as TerritoryOption).result;
            if (!result) return;

            value = result.display_name;
            onInput?.(extractTerritory(result));
            return;
        }

        const countries = new Set<string>();
        const subLvl1 = new Set<string>();
        const subLvl2 = new Set<string>();

        for (const item of selected) {
            const { country, subLvl1: lvl1, subLvl2: lvl2 } = extractTerritory(item.result);

            if (lvl2) {
                subLvl2.add(lvl2);
                continue;
            }

            if (lvl1) {
                subLvl1.add(lvl1);
                continue;
            }

            if (country) {
                countries.add(country);
            }
        }

        onTerritoryChange?.({
            countries: [...countries],
            subLvl1: [...subLvl1],
            subLvl2: [...subLvl2],
        });
    }

    function handleClear() {
        value = "";
        options = [];
        selected = [];
        onInput?.({
            country: null,
            subLvl1: null,
            subLvl2: null,
            address: null,
        });
    }
</script>

<div class={twMerge("relative w-full", classes)}>
    <DropdownMenu
        class={multiple ? "border" : undefined}
        variant={multiple ? "multiselect" : "basic"}
        hasSearch
        searchClasses={error && "border-tertiary border"}
        singleSelect={!multiple}
        clearable={!multiple}
        bind:searchValue={value}
        searchPlaceholder={placeholder}
        bind:options
        bind:selected
        onSearch={handleSearch}
        onChange={handleChange}
        onClear={handleClear}
        onInputBlur={() => onBlur?.()}
    />
    {#if error || helperText}
        <p class={twJoin("mt-1 ml-4 text-xs", error ? "text-tertiary" : "text-content")}>
            {error || helperText}
        </p>
    {/if}
</div>
