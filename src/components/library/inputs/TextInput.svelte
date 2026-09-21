<script lang="ts">
    import { twJoin, twMerge, type ClassNameValue } from "tailwind-merge";

    let {
        value = $bindable<string | number>(""),
        id = undefined,
        name = undefined,
        placeholder = undefined,
        type = "text",
        required = false,
        disabled = false,
        class: classes = "",
        labelText = undefined,
        helperText = undefined,
        error = undefined,
        onInput = undefined,
        onBlur = undefined,
        onFocus = undefined,
    }: {
        value?: string | number | undefined;
        id?: string;
        name?: string;
        placeholder?: string;
        type?: "text" | "email" | "password" | "tel" | "url" | "number";
        required?: boolean;
        disabled?: boolean;
        class?: ClassNameValue;
        labelText?: string;
        helperText?: string;
        error?: string;
        onInput?: (value: string | number) => void;
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
    <input
        bind:value
        id={finalId}
        onblur={onBlur}
        onfocus={onFocus}
        oninput={() => onInput?.(value)}
        {name}
        {type}
        {required}
        {disabled}
        {placeholder}
        class={twMerge(
            "border-secondary text-content focus-within:ring-secondary w-full rounded-lg border bg-white p-4 text-base transition-all outline-none placeholder:text-gray-400",
            error && "border-tertiary text-tertiary placeholder:text-tertiary/60",
            disabled && "cursor-not-allowed",
            classes,
        )}
    />
    <span
        id={`helper-${finalId}`}
        class={twJoin("ml-4 text-xs", error && "text-tertiary", helperText && "text-gray-500")}
    >
        {#if error || helperText}
            {error || helperText}
        {/if}
    </span>
</div>
