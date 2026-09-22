<!--
    @component
    Unified resource search. Pairs the `Search` pill with a results dropdown and
    drives both from a `ResourceSearcher` — the I/O adapter that turns any
    resource (projects, users, territories...) into `SearchResultItem`s.

    Works as a single picker or, with `multiple`, as a multi picker with chips.
-->
<script lang="ts">
    import { clickOutside } from "flowbite-svelte";
    import { untrack } from "svelte";
    import { twJoin, twMerge, type ClassNameValue } from "tailwind-merge";

    import Search from "./Search.svelte";
    import { t } from "../../../i18n/store";
    import { debounce } from "../../../utils/debounce";
    import { highlightMatch } from "../../../utils/highlights";
    import {
        DEFAULT_MIN_CHARS,
        groupResults,
        type ResourceSearcher,
        type SearchResultItem,
    } from "../../../utils/resourceSearch";
    import Close from "../../icons/navigation/Close.svelte";
    import Spinner from "../../icons/status/Spinner.svelte";
    import DropdownItem from "../dropdown/DropdownItem.svelte";
    import SearchCategoryLabel from "../typography/SearchCategoryLabel.svelte";

    import type { Snippet } from "svelte";

    interface Props {
        class?: ClassNameValue;
        /** The I/O adapter: query in, `SearchResultItem[]` out. */
        search: ResourceSearcher;
        /** Multi picker with chips instead of a single picker. */
        multiple?: boolean;
        /** Text typed in the input. */
        value?: string;
        /** Picked items. Always kept in sync, in both single and multiple mode. */
        selected?: SearchResultItem[];
        id?: string;
        label?: string;
        placeholder?: string;
        helperText?: string;
        error?: string;
        minChars?: number;
        debounceMs?: number;
        /** Wrap query matches in <mark> in the default row. */
        highlight?: boolean;
        /** Rendered above the results, e.g. a "N results found" line. */
        header?: Snippet<[SearchResultItem[], string]>;
        /** Replaces the label inside a selected chip (multiple mode). */
        chip?: Snippet<[SearchResultItem]>;
        onSelect?: (item: SearchResultItem) => void;
        onChange?: (items: SearchResultItem[]) => void;
        onClear?: () => void;
        onBlur?: (e: FocusEvent) => void;
    }

    let {
        class: classes = undefined,
        search,
        multiple = false,
        value = $bindable(""),
        selected = $bindable([]),
        id = undefined,
        label = undefined,
        placeholder = undefined,
        helperText = undefined,
        error = undefined,
        minChars = DEFAULT_MIN_CHARS,
        debounceMs = 300,
        highlight = true,
        header = undefined,
        chip = undefined,
        onSelect = undefined,
        onChange = undefined,
        onClear = undefined,
        onBlur = undefined,
    }: Props = $props();

    const uid = $props.id();
    const inputId = $derived(id ?? `resource-search-${uid}`);

    let results = $state<SearchResultItem[]>([]);
    let isLoading = $state(false);
    let isOpen = $state(false);
    let hasSearched = $state(false);
    /** The query the current `results` belong to, used for highlighting. */
    let query = $state("");

    let controller: AbortController | undefined;

    const grouped = $derived(groupResults(results));
    const selectedIds = $derived(new Set(selected.map((s) => s.id)));

    // The delay is fixed per instance; reading it untracked keeps the debounced
    // function stable instead of rebuilding it on every prop read.
    const runSearch = debounce(
        (text: string) => void fetchResults(text),
        untrack(() => debounceMs),
    );

    async function fetchResults(text: string) {
        // Cancel the in-flight request so a slow earlier response cannot
        // overwrite the results of a newer query.
        controller?.abort();
        const current = new AbortController();
        controller = current;

        isLoading = true;
        hasSearched = true;

        try {
            const items = await search(text, current.signal);
            if (current.signal.aborted) return;
            results = items;
            query = text;
        } catch (error) {
            if (current.signal.aborted) return;
            console.error("Resource search failed:", error);
            results = [];
        } finally {
            if (!current.signal.aborted) isLoading = false;
        }
    }

    function handleInput(event: Event) {
        value = (event.target as HTMLInputElement).value;

        if (value.trim().length < minChars) {
            runSearch.cancel();
            controller?.abort();
            results = [];
            hasSearched = false;
            isLoading = false;
            isOpen = false;
            return;
        }

        isOpen = true;
        runSearch(value);
    }

    function handleSelect(picked: SearchResultItem) {
        if (multiple) {
            selected = selectedIds.has(picked.id)
                ? selected.filter((s) => s.id !== picked.id)
                : [...selected, picked];
        } else {
            selected = [picked];
            value = picked.label;
            isOpen = false;
        }

        onSelect?.(picked);
        onChange?.(selected);
    }

    function removeSelected(picked: SearchResultItem) {
        selected = selected.filter((s) => s.id !== picked.id);
        onChange?.(selected);
    }

    function handleClear() {
        runSearch.cancel();
        controller?.abort();
        value = "";
        query = "";
        results = [];
        selected = [];
        hasSearched = false;
        isLoading = false;
        isOpen = false;
        onClear?.();
        onChange?.(selected);
    }

    function rowLabel(entry: SearchResultItem): string {
        const text = highlight ? highlightMatch(entry.label, query) : entry.label;

        return entry.detail
            ? `${text}<span class="mt-1 block text-xs text-gray-500 italic">${entry.detail}</span>`
            : text;
    }

    $effect(() => () => {
        runSearch.cancel();
        controller?.abort();
    });
</script>

<div
    class={twMerge("relative flex w-full flex-col gap-2", classes)}
    use:clickOutside={() => (isOpen = false)}
>
    {#if multiple && selected.length > 0}
        <div class="flex flex-wrap gap-2">
            {#each selected as item (item.id)}
                <span
                    class="bg-tertiary/10 border-secondary inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-sm"
                >
                    {#if chip}
                        {@render chip(item)}
                    {:else}
                        {@html item.label}
                    {/if}
                    <button
                        type="button"
                        class="text-tertiary hover:text-tertiary/80 cursor-pointer"
                        aria-label={$t("domain.search.removeItem", { label: item.label })}
                        onclick={() => removeSelected(item)}
                    >
                        <Close width="12" height="12" />
                    </button>
                </span>
            {/each}
        </div>
    {/if}

    <Search
        id={inputId}
        {label}
        {placeholder}
        bind:value
        class={error ? "border-tertiary" : undefined}
        oninput={handleInput}
        onfocus={() => {
            if (results.length > 0) isOpen = true;
        }}
        onblur={onBlur}
        onclear={handleClear}
    />

    {#if isOpen && hasSearched}
        <div
            class="absolute top-full left-0 z-100 mt-2 flex max-h-72 w-full flex-col overflow-y-auto rounded-lg bg-white shadow-2xl"
        >
            {#if isLoading}
                <div class="flex justify-center p-4">
                    <Spinner />
                </div>
            {:else if results.length === 0}
                <p class="p-4 text-sm text-gray-400">{$t("domain.search.noResults")}</p>
            {:else}
                {#if header}
                    {@render header(results, query)}
                {/if}
                {#each grouped as [group, items] (group)}
                    {#if group}
                        <SearchCategoryLabel class="px-4 pt-3 pb-1">
                            {$t(group)}
                        </SearchCategoryLabel>
                    {/if}
                    {#each items as entry (entry.id)}
                        <DropdownItem
                            variant={multiple ? "multiselect" : "basic"}
                            option={{
                                id: entry.id,
                                label: rowLabel(entry),
                                selected: selectedIds.has(entry.id),
                            }}
                            onChange={() => handleSelect(entry)}
                        />
                    {/each}
                {/each}
            {/if}
        </div>
    {/if}

    {#if error || helperText}
        <p class={twJoin("ml-4 text-xs", error ? "text-tertiary" : "text-content")}>
            {error || helperText}
        </p>
    {/if}
</div>
