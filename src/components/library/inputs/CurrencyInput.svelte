<script lang="ts">
    import { untrack } from "svelte";
    import { twJoin, twMerge, type ClassNameValue } from "tailwind-merge";

    import { locale } from "../../../i18n/store";
    import { DEFAULT_CURRENCY, formatCurrency, parseCurrency } from "../../../utils/currencies";
    import { toUnitsNumber } from "../../../utils/money";

    import type { MoneyInput } from "../../../openapi/client";

    let {
        amount = 0,
        currency = DEFAULT_CURRENCY,
        required = false,
        disabled = false,
        class: classes = "",
        id,
        labelText,
        helperText,
        placeholder,
        error,
        onInput,
    }: {
        amount?: MoneyInput["amount"];
        currency?: MoneyInput["currency"];
        required?: boolean;
        disabled?: boolean;
        class?: ClassNameValue;
        id?: string;
        labelText?: string;
        helperText?: string;
        placeholder?: string;
        error?: string;
        onInput?: (value: MoneyInput) => void;
    } = $props();

    const generatedId = $props.id();
    const finalId = $derived(id ?? generatedId);

    let input: HTMLInputElement;
    let focused = $state(false);

    /** Formats an amount for display, rendering an empty string at zero so the placeholder shows. */
    function format(value: number): string {
        return value ? formatCurrency({ amount: value, currency }, { locale: $locale }) : "";
    }

    /**
     * Formats an amount as a bare, editable number for the focused state.
     *
     * Must use the same locale separators `parseCurrency` expects: under `es` a "." is the *group*
     * separator, so emitting "12.5" here would be read back as 1250 units instead of 12,5.
     */
    function toEditable(value: number): string {
        if (!value) return "";

        return new Intl.NumberFormat($locale, {
            useGrouping: false,
            maximumFractionDigits: 20,
        }).format(toUnitsNumber({ amount: value, currency }));
    }

    // Initial value only; the effect below keeps it in sync with `amount` while unfocused.
    let display = $state(untrack(() => format(amount)));

    $effect(() => {
        if (!focused) {
            display = format(amount);
        }
    });

    function handleFocus() {
        focused = true;

        display = toEditable(amount);

        requestAnimationFrame(() => {
            input?.setSelectionRange(display.length, display.length);
        });
    }

    function handleInput(event: Event) {
        display = (event.currentTarget as HTMLInputElement).value;

        const parsed = parseCurrency(display, currency, $locale);

        amount = Number.isFinite(parsed) ? parsed : 0;
        onInput?.({ amount, currency });
    }

    function handleBlur() {
        focused = false;
        display = format(amount);
    }
</script>

<div class={twMerge("relative", disabled && "opacity-50")}>
    {#if labelText}
        <label
            for={finalId}
            class={twJoin(
                "text-secondary absolute top-0 left-4 -translate-y-1/2 transform bg-white px-1 text-sm font-medium transition-all",
                error && "text-tertiary",
                disabled && "opacity-70",
            )}
        >
            {labelText}
        </label>
    {/if}

    <input
        bind:this={input}
        id={finalId}
        value={display}
        onfocus={handleFocus}
        oninput={handleInput}
        onblur={handleBlur}
        type="text"
        inputmode="decimal"
        autocomplete="off"
        {placeholder}
        {required}
        {disabled}
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
