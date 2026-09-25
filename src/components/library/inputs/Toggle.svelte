<!--
    @component
    Dynamic Toggle button
-->
<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import type { HTMLButtonAttributes } from "svelte/elements";

    interface Props extends Omit<HTMLButtonAttributes, "class" | "value"> {
        /** Current state, `true` for on */
        value?: boolean;

        /**
         * Callback function that receives the new value of the state
         * @param value `true` for on, `false` for off
         */
        onChange?: (value: boolean) => void;

        /**
         * Generic classes applied to the inner button markup on both on and off positions
         */
        btnClass?: ClassNameValue;
        btnClassOn?: ClassNameValue;
        btnClassOff?: ClassNameValue;

        /**
         * Generic classes applied to the inner div markup on both on and off positions
         */
        circleClass?: ClassNameValue;
        circleClassOn?: ClassNameValue;
        circleClassOff?: ClassNameValue;
    }

    let {
        value = $bindable(false),
        onChange,
        btnClass,
        btnClassOn,
        btnClassOff,
        circleClass,
        circleClassOn,
        circleClassOff,
        ...rest
    }: Props = $props();

    function handleToggle() {
        value = !value;

        onChange?.(value);
    }

    let button: HTMLButtonElement | undefined;
    let toggleEnd: string = $state("0px");

    $effect(() => {
        if (!button) return;

        toggleEnd = `${button.offsetWidth - button.offsetHeight}px`;
    });
</script>

<button
    bind:this={button}
    type="button"
    role="switch"
    aria-checked={value}
    onclick={() => handleToggle()}
    style={`--toggleEnd: ${toggleEnd}`}
    class={twMerge(
        "border-purple-soft flex h-8 w-16 cursor-pointer items-center overflow-hidden rounded-full border p-1 transition-all duration-500 ease-in-out",
        value ? "bg-variant2" : "bg-variant1",
        value ? btnClassOn : btnClassOff,
        btnClass,
    )}
    {...rest}
>
    <!-- Filter Drop shadow CSS attribute from Figma (better with inline style due to the large amount of drop shadows) -->
    <div
        style="filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.10)) drop-shadow(0 6px 6px rgba(0, 0, 0, 0.09)) drop-shadow(0 13px 8px rgba(0, 0, 0, 0.05)) drop-shadow(0 22px 9px rgba(0, 0, 0, 0.01)) drop-shadow(0 35px 10px rgba(0, 0, 0, 0.00));"
        class={twMerge(
            "aspect-square h-full shrink-0 rounded-full transition-all duration-500 ease-in-out",
            value ? "bg-primary" : "bg-secondary",
            value ? "translate-x-(--toggleEnd)" : "translate-x-0",
            value ? circleClassOn : circleClassOff,
            circleClass,
        )}
    ></div>
</button>
