<script lang="ts">
    import { twJoin, twMerge, type ClassNameValue } from "tailwind-merge";

    let {
        value = $bindable(""),
        id = undefined,
        name = undefined,
        placeholder = undefined,
        labelText = undefined,
        helperText = undefined,
        error = undefined,
        disabled = false,
        class: classes = "",
        rows = 4,
        onInput = undefined,
        onBlur = undefined,
        onFocus = undefined,
    }: {
        value?: string;
        id?: string;
        name?: string;
        placeholder?: string;
        labelText?: string;
        helperText?: string;
        error?: string;
        disabled?: boolean;
        class?: ClassNameValue;
        rows?: number;
        onInput?: (text: string) => void;
        onBlur?: (event?: FocusEvent) => void;
        onFocus?: (event?: FocusEvent) => void;
    } = $props();

    const generatedId = $props.id();
    const finalId = $derived(id ?? generatedId);
</script>

<div class={twJoin("relative", disabled && "opacity-50")}>
    {#if labelText}
        <label
            for={finalId}
            class={twJoin(
                "text-secondary absolute top-0 left-4 -translate-y-1/2 transform bg-white px-1 text-sm font-medium transition-all",
                error && "text-tertiary",
            )}
        >
            {labelText}
        </label>
    {/if}
    <textarea
        {id}
        {name}
        {disabled}
        {placeholder}
        {rows}
        onblur={onBlur}
        onfocus={onFocus}
        oninput={() => onInput?.(value)}
        bind:value
        class={twMerge(
            "border-secondary text-content min-h-30 w-full resize-none rounded-lg border bg-white p-4 text-base transition-all outline-none placeholder:text-gray-400 focus:ring-0",
            error && "border-tertiary text-tertiary placeholder:text-tertiary/60",
            disabled && "bg-grey cursor-not-allowed border-transparent",
            classes,
        )}></textarea>
    {#if error || helperText}
        <span
            id={`helper-${finalId}`}
            class={twJoin("ml-4 text-xs", error && "text-tertiary", helperText && "text-gray-500")}
        >
            {error || helperText}
        </span>
    {/if}
</div>
