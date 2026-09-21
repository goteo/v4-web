<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import { t } from "../../../i18n/store";
    import CloseIcon from "../../icons/navigation/Close.svelte";

    interface Props {
        class?: ClassNameValue;
        value?: string;
        placeholder?: string;
        name?: string;
        id?: string;
        label?: string;
        error?: string;
        isValid?: boolean;
        validate?: boolean;
    }

    let {
        class: classes = "",
        value = $bindable(""),
        placeholder,
        name = "email",
        id = "email",
        label,
        error = $t("pages.checkout.login.error.invalidEmail"),
        isValid = $bindable(true),
        validate = true,
    }: Props = $props();

    const emailRegex = /^[^@].*@.*\.[a-zA-Z]+$/;

    $effect(() => {
        if (validate) {
            isValid = value === "" || emailRegex.test(value);
        }
    });
</script>

<div class={twMerge("flex w-full flex-col", classes)}>
    <div
        class={twMerge(
            "border-secondary relative flex h-14 w-full items-center justify-between rounded-3xl border bg-white p-4 transition-all",
            !isValid && "border-tertiary ring-tertiary ring-1",
        )}
    >
        {#if label !== undefined}
            <label
                for={id}
                class={twMerge(
                    "absolute -top-3 left-3 bg-white px-1 text-sm transition-colors",
                    !isValid && "text-tertiary",
                )}
            >
                {label}
            </label>
        {/if}

        <input
            type="text"
            {name}
            {id}
            {placeholder}
            bind:value
            class="flex-1 border-none bg-transparent text-black outline-none focus:ring-0"
        />

        {#if value !== ""}
            <button class="cursor-pointer outline-none" onclick={() => (value = "")} type="button">
                <CloseIcon
                    class={twMerge(
                        "pointer-events-none h-6 w-6 transition-colors",
                        isValid ? "text-secondary" : "text-tertiary",
                    )}
                />
            </button>
        {/if}
    </div>

    {#if !isValid}
        <span class="text-tertiary mt-1 pl-4 text-sm">
            {error}
        </span>
    {/if}
</div>
