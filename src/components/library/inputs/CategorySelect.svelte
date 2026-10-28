<script lang="ts">
    import { t } from "../../../i18n/store";
    import CategoryOption from "../tags/Category.svelte";

    import type { Category } from "../../../openapi/client";

    let {
        options,
        selected = $bindable([]),
        selectedIds = $bindable([]),
        max,
        onChange,
        error = undefined,
    }: {
        options: Category[];
        selected?: Category[];
        selectedIds?: (number | string)[];
        max?: number;
        onChange?: (selected: Category[], option: Category) => void;
        error?: string;
    } = $props();

    function isSelected(option: Category): boolean {
        return selectedIds.includes(option.id!);
    }

    function handleClick(option: Category): void {
        if (isSelected(option)) {
            selectedIds = selectedIds.filter((id) => id !== option.id);
        } else {
            selectedIds = selectedIds.concat(option.id!);
        }

        selected = options.filter((option) => selectedIds.includes(option.id!));

        onChange?.(selected, option);
    }

    function calcTagType(option: Category) {
        if (max === selectedIds.length) {
            return isSelected(option) ? "active" : "ghost";
        }

        return isSelected(option) ? "active" : "default";
    }

    function calcTagDisabled(option: Category) {
        if (max === selectedIds.length && !isSelected(option)) {
            return true;
        }

        return false;
    }
</script>

<div>
    {#if options.length === 0}
        <p class="text-content">{$t("common.noOptions")}</p>
    {:else}
        <fieldset
            class="m-0 flex flex-wrap gap-4 border-0 p-0"
            aria-describedby={error ? "category-error" : undefined}
        >
            {#each options as option}
                <CategoryOption
                    type={calcTagType(option)}
                    disabled={calcTagDisabled(option)}
                    onclick={() => handleClick(option)}
                >
                    {option.name}
                </CategoryOption>
            {/each}
        </fieldset>
    {/if}
    {#if error}
        <p id="category-error" class="mt-2 ml-4 text-xs text-red-600" role="alert">
            {error}
        </p>
    {/if}
</div>
