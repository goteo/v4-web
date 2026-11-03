<script lang="ts">
    import { twJoin, twMerge, type ClassNameValue } from "tailwind-merge";

    import { t } from "../../../i18n/store";
    import Eye from "../../icons/media/Eye.svelte";

    interface Props {
        class?: ClassNameValue;
        value?: string;
        placeholder?: string;
        name?: string;
        id?: string;
        label?: string;
        labelText?: string;
        helperText?: string;
        error?: string;
        required?: boolean;
        disabled?: boolean;
        validate?: boolean;
        onInput?: (event: Event) => void;
        onBlur?: (event?: FocusEvent) => void;
        onFocus?: (event?: FocusEvent) => void;
    }

    let {
        class: classes = "",
        value = $bindable(""),
        placeholder,
        name = "password",
        id = "password",
        label = undefined,
        labelText = undefined,
        helperText = undefined,
        error = undefined,
        required = false,
        disabled = false,
        validate = false,
        onInput = undefined,
        onBlur = undefined,
        onFocus = undefined,
    }: Props = $props();

    let showPassword = $state(false);

    function togglePassword() {
        if (disabled) return;
        showPassword = !showPassword;
    }

    const generatedId = $props.id();
    const finalId = $derived(id ?? generatedId);
    const floatingLabel = $derived(labelText ?? label);

    const errorId = $derived(`${finalId}-error`);
    const helperId = $derived(`${finalId}-helper`);
</script>

<div class={twMerge("relative", classes)}>
    <div
        class={twMerge(
            "border-secondary relative flex h-14 w-full items-center justify-between rounded-lg border bg-white p-4 transition-all",
            !error && "focus-within:ring-secondary focus-within:ring-1",
            error && "border-tertiary ring-tertiary ring-1",
            disabled && "bg-grey cursor-not-allowed opacity-50",
        )}
    >
        {#if floatingLabel !== undefined}
            <label
                for={finalId}
                class={twMerge(
                    "absolute -top-3 left-3 bg-white px-1 text-sm transition-colors",
                    error && "text-tertiary",
                    disabled && "opacity-70",
                )}
            >
                {floatingLabel}
                {#if required}<span class="text-tertiary">*</span>{/if}
            </label>
        {/if}

        <input
            type={showPassword ? "text" : "password"}
            {name}
            {id}
            {placeholder}
            {required}
            {disabled}
            bind:value
            oninput={onInput}
            onblur={onBlur}
            onfocus={onFocus}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            class="text-content m-0 flex-1 rounded-lg border-none bg-white p-0 outline-none focus:ring-0 disabled:cursor-not-allowed"
        />

        <button
            type="button"
            onclick={togglePassword}
            class="text-secondary cursor-pointer"
            {disabled}
            aria-label={showPassword
                ? $t("domain.passwordInput.hide")
                : $t("domain.passwordInput.show")}
        >
            <Eye class="pointer-events-none h-6 w-6" closed={!showPassword} />
        </button>
    </div>

    {#if error || helperText}
        <span
            id={error ? errorId : helperId}
            class={twJoin("ml-4 text-xs", error && "text-tertiary", helperText && "text-gray-500")}
        >
            {error || helperText}
        </span>
    {/if}
</div>
