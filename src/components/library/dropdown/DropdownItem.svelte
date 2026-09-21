<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import type { DropdownOption, DropdownVariant } from "./dropdown.types";

    interface Props {
        option: DropdownOption;
        variant: DropdownVariant;
        onChange?: (option: DropdownOption) => void;
        class?: ClassNameValue;
    }

    let { option, variant, onChange, class: classes }: Props = $props();

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
        <label class="flex cursor-pointer justify-between p-4">
            <span class="text-base text-black">{@html option.label}</span>
            <input
                type="checkbox"
                checked={option.selected}
                onchange={() => handleChange(option)}
                class="text-primary border-secondary mt-1 size-5 shrink-0 rounded-sm border ring-0"
            />
        </label>
    {:else if variant === "basic"}
        <button
            class="w-full cursor-pointer p-4 text-base text-black"
            onclick={() => handleChange(option)}
        >
            {@html option.label}
        </button>
    {/if}
</div>
