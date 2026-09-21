<script lang="ts">
    import { clickOutside } from "flowbite-svelte";
    import { twJoin, twMerge, type ClassNameValue } from "tailwind-merge";

    import DropdownItem from "./DropdownItem.svelte";
    import { t } from "../../../i18n/store";
    import SearchIcon from "../../icons/actions/Search.svelte";
    import Chevron from "../../icons/navigation/Chevron.svelte";
    import Close from "../../icons/navigation/Close.svelte";
    import Tag from "../tags/Tag.svelte";

    import type { DropdownOption, DropdownVariant } from "./dropdown.types";
    import type { Snippet } from "svelte";

    interface Props {
        class?: ClassNameValue;
        searchClasses?: ClassNameValue;
        variant: DropdownVariant;
        options: DropdownOption[];
        selected?: DropdownOption[];
        onChange?: (option: DropdownOption) => void;
        hasSearch?: boolean;
        searchPlaceholder?: string;
        searchValue?: string;
        onSearch?: (value: string) => void;
        clearable?: boolean;
        onClear?: () => void;
        singleSelect?: boolean;
        onInputBlur?: (e?: FocusEvent) => void;
        /** Build the list with selected options at the top. */
        label?: string;
        selectedFirst?: boolean;
        isOpen?: boolean;
        /** Collapsed trigger shows the current selection as removable pills. */
        chips?: boolean;
        /** Renders the body of one pill; defaults to the option label. */
        chip?: Snippet<[DropdownOption]>;
    }

    let {
        class: classes = undefined,
        searchClasses = undefined,
        variant,
        options = $bindable([]),
        selected = $bindable([]),
        onChange,
        hasSearch = false,
        searchPlaceholder = $t("domain.search.bar.placeholder"),
        searchValue = $bindable(""),
        onSearch = undefined,
        clearable = false,
        onClear = undefined,
        singleSelect = false,
        onInputBlur = undefined,
        label = undefined,
        selectedFirst = false,
        isOpen = $bindable(false),
        chips = false,
        chip = undefined,
    }: Props = $props();

    const listId = $props.id();

    const hasHeader = $derived(hasSearch || !!label);
    const showChips = $derived(chips && selected.length > 0 && !isOpen);

    const renderedItems = $derived.by(() => {
        const selectedIds = new Set(selected.map((s) => s.id));

        const merged: DropdownOption[] = selectedFirst
            ? [...selected, ...options.filter((option) => !selectedIds.has(option.id))]
            : [
                  ...options,
                  ...selected.filter((item) => !options.some((option) => option.id === item.id)),
              ];

        return merged.map((item, index, arr) => ({
            ...item,
            selected: selectedIds.has(item.id),
            position: getPosition(index, arr.length),
        }));
    });

    function getPosition(index: number, length: number): "start" | "middle" | "end" {
        if (index === 0 && !hasHeader) return "start";
        if (index === length - 1) return "end";
        return "middle";
    }

    function isSelected(option: DropdownOption): boolean {
        return selected.length > 0 && selected.some((s) => s.id === option.id);
    }

    function handleClear() {
        searchValue = "";
        selected = [];
        isOpen = false;
        onClear?.();
    }

    function handleItemChange(option: DropdownOption) {
        if (singleSelect) {
            selected = [{ ...option, selected: true }];
            isOpen = false;
        } else if (option.selected && !isSelected(option)) {
            selected = [...selected, option];
        } else if (!option.selected && isSelected(option)) {
            selected = selected.filter((s) => s.id !== option.id);
        }
        onChange?.(option);
    }

    let chevronLabel = $derived(
        selected.length && selected.length < options.length
            ? selected.map((option) => option.label).join(", ")
            : label,
    );
</script>

<div
    class={twMerge("relative flex w-full flex-col border-none", classes)}
    use:clickOutside={() => (isOpen = false)}
    onkeydown={(e) => e.key === "Escape" && (isOpen = false)}
    role="presentation"
>
    {#if showChips}
        <div
            class="border-secondary flex min-h-14 cursor-pointer flex-wrap items-center gap-2 rounded-lg border bg-white p-3"
            role="button"
            tabindex="0"
            aria-expanded={isOpen}
            aria-controls={listId}
            onclick={() => (isOpen = true)}
            onkeydown={(e) => (e.key === "Enter" || e.key === " ") && (isOpen = true)}
        >
            {#each selected as option}
                <Tag variant="bold">
                    {#if chip}
                        {@render chip(option)}
                    {:else}
                        {@html option.label}
                    {/if}
                    <button
                        type="button"
                        class="text-tertiary hover:text-tertiary/80 cursor-pointer"
                        aria-label={$t("common.remove")}
                        onclick={(e) => {
                            e.stopPropagation();
                            handleItemChange({ ...option, selected: false });
                        }}
                    >
                        <Close width="12" height="12" />
                    </button>
                </Tag>
            {/each}
        </div>
    {:else if hasSearch}
        <div
            class={twMerge(
                "group flex w-full items-center justify-between rounded-lg border border-gray-100 bg-white p-4 shadow-sm outline-none focus:outline-none",
                searchClasses,
            )}
        >
            <input
                class="max-h-6 w-full border-0 bg-white p-0 text-base/6 font-normal text-black ring-0 placeholder:opacity-48"
                type="text"
                placeholder={searchPlaceholder}
                aria-expanded={isOpen}
                aria-controls={listId}
                bind:value={searchValue}
                oninput={(e) => onSearch?.(e.currentTarget.value)}
                onblur={onInputBlur}
                onclick={() => {
                    if (!isOpen) isOpen = true;
                }}
            />
            <div class="absolute right-4 flex flex-row gap-1 bg-white">
                {#if clearable && searchValue}
                    <button
                        type="button"
                        class="shrink-0 hover:cursor-pointer hover:opacity-75"
                        onclick={handleClear}
                    >
                        <Close width="20" height="20" />
                    </button>
                {/if}
                <SearchIcon width="32" height="32" />
            </div>
        </div>
    {:else}
        <button
            type="button"
            class="group flex w-full items-center justify-between rounded-lg border border-gray-100 bg-white p-4 text-base/6 font-normal text-black shadow-sm outline-none focus:outline-none"
            aria-expanded={isOpen}
            aria-controls={listId}
            onclick={() => (isOpen = !isOpen)}
        >
            {chevronLabel}
            <Chevron
                direction="down"
                width="20"
                height="20"
                class={twJoin("transition-transform", isOpen && "rotate-180")}
            />
        </button>
    {/if}

    {#if isOpen && renderedItems.length > 0}
        <div
            class="absolute top-full left-0 z-100 mt-2 w-full flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        >
            <div
                id={listId}
                role="listbox"
                aria-multiselectable={!singleSelect}
                class="flex max-h-72 w-full flex-col overflow-y-auto"
            >
                {#each renderedItems as item}
                    <DropdownItem
                        {variant}
                        option={item}
                        onChange={handleItemChange}
                        class={twJoin(
                            item.position === "start" && "rounded-t-lg",
                            item.position === "end" && "rounded-b-lg",
                        )}
                    />
                {/each}
            </div>
        </div>
    {/if}
</div>
