<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import Check from "../../icons/actions/Check.svelte";
    import Checkbox from "../inputs/Checkbox.svelte";

    import type { DropdownOption, DropdownVariant } from "./dropdown.types";
    import type { Snippet } from "svelte";

    interface Props {
        option: DropdownOption;
        variant: DropdownVariant;
        onChange?: (option: DropdownOption) => void;
        /** Replaces the label with a richer row. Return `null` to fall back. */
        row?: Snippet<[DropdownOption]>;
        class?: ClassNameValue;
    }

    let { option, variant, onChange, row = undefined, class: classes }: Props = $props();

    function handleChange(o: DropdownOption) {
        option = { ...o, selected: !o.selected };

        onChange?.(option);
    }
</script>

<div
    class={twMerge(
        "border-grey hover:bg-purple-soft hover:border-variant1 cursor-pointer border bg-white text-start",
        classes,
    )}
    role="option"
    aria-selected={option.selected}
>
    {#if variant === "multiselect"}
        <Checkbox
            checked={option.selected}
            onchange={() => handleChange(option)}
            class="flex-row-reverse justify-between p-4"
        >
            <span class="text-base text-black">
                {#if row}
                    {@render row(option)}
                {:else}
                    {@html option.label}
                {/if}
            </span>
        </Checkbox>
    {:else if variant === "basic"}
        <button
            class={twMerge("block w-full cursor-pointer p-4 text-base text-black", classes)}
            onclick={() => handleChange(option)}
        >
            <span>
                {#if row}
                    {@render row(option)}
                {:else}
                    {@html option.label}
                {/if}
            </span>
            {#if option.selected}
                <Check width="20" height="20" class="text-primary shrink-0" />
            {/if}
        </button>
    {/if}
</div>
