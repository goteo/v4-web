<script lang="ts">
    import { twJoin, twMerge, type ClassNameValue } from "tailwind-merge";

    import { locale } from "../../../i18n/store";
    import { DEFAULT_CURRENCY, formatCurrency, getUnit } from "../../../utils/currencies";

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
        error?: string;
        onInput?: (value: MoneyInput) => void;
    } = $props();

    const generatedId = $props.id();
    const finalId = $derived(id ?? generatedId);

    let input: HTMLInputElement;
    let focused = false;
    let display = $derived(formatCurrency({ amount, currency }, { locale: $locale }));

    $effect(() => {
        if (!focused) {
            display = formatCurrency({ amount, currency }, { locale: $locale });
        }
    });

    function toMoney(raw: string): MoneyInput | null {
        const normalized = raw.replace(/[^\d.,-]/g, "").replace(/,/g, "");
        if (!normalized || normalized === "-" || normalized === ".") {
            return null;
        }

        const amount = Number(normalized);
        if (!Number.isFinite(amount)) {
            return null;
        }

        return {
            amount: Math.round(amount * getUnit(currency)),
            currency: currency,
        };
    }

    function emit(next: MoneyInput) {
        amount = next.amount;
        currency = next.currency;
        onInput?.(next);
    }

    function handleFocus() {
        focused = true;

        display = (amount / getUnit(currency)).toFixed(Math.max(0, Math.log10(getUnit(currency))));
        display = display.replace(/\.?0+$/, "");

        requestAnimationFrame(() => {
            input?.setSelectionRange(display.length, display.length);
        });
    }

    function handleInput(event: Event) {
        const target = event.currentTarget as HTMLInputElement;
        const raw = target.value;

        const sanitized = raw.replace(/[^\d.,-]/g, "");
        const normalized = sanitized.includes(".")
            ? sanitized.replace(/,/g, "")
            : sanitized.replace(",", ".");

        display = normalized;

        const next = toMoney(normalized);

        if (next) {
            emit(next);
        } else if (normalized === "") {
            emit({
                amount: 0,
                currency: currency,
            });
        }
    }

    function handleBlur() {
        focused = false;
        display = formatCurrency({ amount, currency }, { locale: $locale });
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
