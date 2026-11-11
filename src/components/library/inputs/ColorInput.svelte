<script lang="ts">
    import { twJoin, twMerge, type ClassNameValue } from "tailwind-merge";

    import { isHexColor } from "../../../utils/themeColors";
    import Warning from "../../icons/status/Warning.svelte";

    interface Props {
        value?: string;
        id?: string;
        name?: string;
        labelText: string;
        helperText?: string;
        pickerLabel?: string;
        error?: string;
        contrastWarnings?: string[];
        disabled?: boolean;
        class?: ClassNameValue;
    }

    let {
        value = $bindable(""),
        id = undefined,
        name = undefined,
        labelText,
        helperText = undefined,
        pickerLabel = labelText,
        error = undefined,
        contrastWarnings = [],
        disabled = false,
        class: classes = "",
    }: Props = $props();

    const generatedId = $props.id();
    const finalId = $derived(id ?? generatedId);
    const pickerValue = $derived(isHexColor(value) ? value.slice(0, 7) : "#000000");

    function handlePickerInput(event: Event) {
        const pickedColor = (event.currentTarget as HTMLInputElement).value;
        const alpha = value.length === 9 ? value.slice(7) : "";
        value = `${pickedColor}${alpha}`;
    }
</script>

<div class={twMerge("relative flex flex-col gap-2", classes)}>
    <label for={finalId} class="text-secondary text-sm font-medium">
        {labelText}
    </label>
    <div
        class={twJoin(
            "border-secondary focus-within:ring-secondary flex items-center gap-3 rounded-lg border bg-white p-2 focus-within:ring-1",
            error && "border-tertiary",
            disabled && "cursor-not-allowed opacity-50",
        )}
    >
        <input
            type="color"
            value={pickerValue}
            oninput={handlePickerInput}
            aria-label={pickerLabel}
            {disabled}
            class="h-10 w-12 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
            bind:value
            id={finalId}
            {name}
            {disabled}
            type="text"
            inputmode="text"
            autocomplete="off"
            spellcheck="false"
            aria-invalid={Boolean(error)}
            aria-describedby={error || helperText ? `helper-${finalId}` : undefined}
            class={twMerge(
                "text-content min-w-0 flex-1 bg-transparent p-1 font-mono text-base uppercase outline-none",
                error && "text-tertiary",
            )}
        />
        <span
            class="border-grey h-8 w-8 shrink-0 rounded-full border"
            style:background-color={isHexColor(value) ? value : "transparent"}
            aria-hidden="true"
        ></span>
    </div>
    {#if error || helperText}
        <span
            id={`helper-${finalId}`}
            class={twJoin("text-xs", error ? "text-tertiary" : "text-content")}
        >
            {error || helperText}
        </span>
    {/if}
    {#if contrastWarnings.length}
        <div class="flex flex-col gap-1" aria-live="polite">
            {#each contrastWarnings as warning}
                <p
                    class="bg-semantic-warning flex items-start gap-2 rounded-md p-2 text-xs text-black"
                >
                    <Warning class="mt-0.5 size-4 shrink-0" />
                    <span>{warning}</span>
                </p>
            {/each}
        </div>
    {/if}
</div>
