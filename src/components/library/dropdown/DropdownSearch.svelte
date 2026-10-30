<!--
    @component
    `DropdownMenu` with a search input as trigger. Options come from `search`,
    called debounced on input and right away when the dropdown opens. A spinner
    fills the list box while a search is running.
-->
<script lang="ts">
    import { untrack } from "svelte";
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import DropdownMenu from "./DropdownMenu.svelte";
    import { t } from "../../../i18n/store";
    import { debounce } from "../../../utils/debounce";
    import SearchIcon from "../../icons/actions/Search.svelte";
    import Close from "../../icons/navigation/Close.svelte";

    import type { DropdownOption, DropdownVariant } from "./dropdown.types";
    import type { Snippet } from "svelte";

    interface Props {
        class?: ClassNameValue;
        /** Extra classes for the search input box. */
        searchClasses?: ClassNameValue;
        variant: DropdownVariant;
        /** Resolves the trimmed query into options. May be sync for local filtering. */
        search: (
            query: string,
            signal: AbortSignal,
        ) => DropdownOption[] | Promise<DropdownOption[]>;
        /** Text typed in the input. */
        value?: string;
        placeholder?: string;
        selected?: DropdownOption[];
        onChange?: (option: DropdownOption) => void;
        clearable?: boolean;
        singleSelect?: boolean;
        label?: string;
        selectedFirst?: boolean;
        /** Shorter queries don't search and empty the list. */
        minChars?: number;
        debounceMs?: number;
        chips?: boolean;
        itemClass?: ClassNameValue;
        /** Replaces the label of every list item, see `DropdownMenu`. */
        row?: Snippet<[DropdownOption]>;
    }

    let {
        class: classes = undefined,
        searchClasses = undefined,
        variant,
        search,
        value = $bindable(""),
        placeholder = $t("domain.search.bar.placeholder"),
        selected = $bindable([]),
        onChange = undefined,
        clearable = false,
        singleSelect = false,
        label = undefined,
        selectedFirst = false,
        minChars = 0,
        debounceMs = 300,
        chips = false,
        itemClass = undefined,
        row = undefined,
    }: Props = $props();

    let options = $state<DropdownOption[]>([]);
    let isLoading = $state(false);
    let isOpen = $state(false);

    let controller: AbortController | undefined;

    const canSearch = $derived(value.trim().length >= minChars);

    // The delay is fixed per instance; reading it untracked keeps the debounced
    // function stable instead of rebuilding it on every prop read.
    const runSearch = debounce(
        (text: string) => void fetchOptions(text),
        untrack(() => debounceMs),
    );

    async function fetchOptions(text: string) {
        // Cancel the in-flight request so a slow earlier response cannot
        // overwrite the options of a newer query.
        controller?.abort();
        const current = new AbortController();
        controller = current;

        isLoading = true;

        try {
            const results = await search(text.trim(), current.signal);
            if (current.signal.aborted) return;
            options = results;
        } catch (error) {
            if (current.signal.aborted) return;
            console.error("Dropdown search failed:", error);
            options = [];
        } finally {
            if (!current.signal.aborted) isLoading = false;
        }
    }

    function reset() {
        runSearch.cancel();
        controller?.abort();
        options = [];
        isLoading = false;
    }

    function handleInput() {
        // Opening searches right away, see the effect below.
        if (!isOpen) {
            isOpen = true;
            return;
        }

        if (!canSearch) return reset();

        isLoading = true;
        runSearch(value);
    }

    // Opened from the input or from the chips: refresh with the current query.
    $effect(() => {
        if (!isOpen) return;

        untrack(() => {
            if (!canSearch) return reset();

            runSearch.cancel();
            void fetchOptions(value);
        });
    });

    function handleChange(option: DropdownOption) {
        if (singleSelect && !chips) value = option.label;
        onChange?.(option);
    }

    function handleClear() {
        reset();
        value = "";
        selected = [];
        isOpen = false;
    }

    $effect(() => () => reset());
</script>

<DropdownMenu
    class={classes}
    {variant}
    {options}
    bind:selected
    bind:isOpen
    onChange={handleChange}
    {singleSelect}
    {label}
    {selectedFirst}
    loading={isLoading}
    showEmpty={canSearch && !!value.trim()}
    {chips}
    {itemClass}
    {row}
>
    {#snippet trigger(listId)}
        <div
            class={twMerge(
                "group flex w-full items-center justify-between rounded-lg border border-gray-100 bg-white p-4 shadow-sm outline-none focus:outline-none",
                searchClasses,
            )}
        >
            <input
                class="max-h-6 w-full border-0 bg-white p-0 text-base/6 font-normal text-black ring-0 placeholder:opacity-48"
                type="text"
                role="combobox"
                {placeholder}
                aria-expanded={isOpen}
                aria-controls={listId}
                bind:value
                oninput={handleInput}
                onclick={() => (isOpen = true)}
            />
            <div class="absolute right-4 flex flex-row gap-1 bg-white">
                {#if clearable && value}
                    <button
                        type="button"
                        class="shrink-0 hover:cursor-pointer hover:opacity-75"
                        aria-label={$t("common.remove")}
                        onclick={handleClear}
                    >
                        <Close width="20" height="20" />
                    </button>
                {/if}
                <SearchIcon width="32" height="32" />
            </div>
        </div>
    {/snippet}
</DropdownMenu>
