<script lang="ts">
    import { clickOutside } from "flowbite-svelte";
    import { twJoin, twMerge, type ClassNameValue } from "tailwind-merge";

    import DropdownItem from "./DropdownItem.svelte";
    import { t } from "../../../i18n/store";
    import Chevron from "../../icons/navigation/Chevron.svelte";
    import Close from "../../icons/navigation/Close.svelte";
    import Spinner from "../../icons/status/Spinner.svelte";
    import Tag from "../tags/Tag.svelte";

    import type { DropdownOption, DropdownVariant } from "./dropdown.types";
    import type { Snippet } from "svelte";

    type RenderedItem = DropdownOption & { position: "start" | "middle" | "end" };

    interface Props {
        class?: ClassNameValue;
        variant: DropdownVariant;
        options: DropdownOption[];
        selected?: DropdownOption[];
        onChange?: (option: DropdownOption) => void;
        singleSelect?: boolean;
        label?: string;
        /** Build the list with selected options at the top. */
        selectedFirst?: boolean;
        isOpen?: boolean;
        /** Shows a spinner in the list box instead of the options. */
        loading?: boolean;
        /** Shows the "no options" box when the list is empty. */
        showEmpty?: boolean;
        /** Collapsed trigger shows the current selection as removable pills. */
        chips?: boolean;
        /** Renders the body of one pill; defaults to the option label. */
        chip?: Snippet<[DropdownOption]>;
        /** Replaces the default chevron button. Receives the list id for `aria-controls`. */
        trigger?: Snippet<[string]>;
        /**
         * Extra classes for every list item, e.g. to change the text alignment.
         * Applied to the <button>/<label> element that holds the option label.
         */
        itemClass?: ClassNameValue;
        /**
         * Replaces the label of every list item with a richer row, e.g. to
         * render a user with its avatar. Return `null` to fall back.
         */
        row?: Snippet<[DropdownOption]>;
    }

    let {
        class: classes = undefined,
        variant,
        options = $bindable([]),
        selected = $bindable([]),
        onChange,
        singleSelect = false,
        label = undefined,
        selectedFirst = false,
        isOpen = $bindable(false),
        loading = false,
        showEmpty = true,
        chips = false,
        chip = undefined,
        trigger = undefined,
        itemClass = undefined,
        row = undefined,
    }: Props = $props();

    const listId = $props.id();

    const hasHeader = $derived(!!trigger || !!label);
    const showChips = $derived(chips && selected.length > 0 && !isOpen);

    const renderedItems = $derived.by((): RenderedItem[] => {
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
    {:else if trigger}
        {@render trigger(listId)}
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

    {#if isOpen}
        {#if loading}
            <div
                class="absolute top-full left-0 z-100 mt-2 flex w-full justify-center rounded-lg bg-white p-4 shadow-2xl"
            >
                <Spinner />
            </div>
        {:else if renderedItems.length}
            <div
                id={listId}
                role="listbox"
                class="absolute top-full left-0 z-100 mt-2 w-full flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
            >
                {#each renderedItems as item}
                    <DropdownItem
                        {variant}
                        option={item}
                        onChange={handleItemChange}
                        {row}
                        class={twJoin(
                            item.position === "start" && "rounded-t-lg",
                            item.position === "end" && "rounded-b-lg",
                            itemClass,
                        )}
                    />
                {/each}
            </div>
        {:else if showEmpty}
            <p
                class="text-content absolute top-full left-0 z-100 mt-2 w-full rounded-lg bg-white p-4 text-base shadow-2xl"
            >
                {$t("common.noOptions")}
            </p>
        {/if}
    {/if}
</div>
