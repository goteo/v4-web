<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import type { Snippet } from "svelte";
    import type { HTMLInputAttributes } from "svelte/elements";

    interface Props extends Omit<HTMLInputAttributes, "class"> {
        id?: string;
        checked?: boolean;
        label?: string;
        class?: ClassNameValue;
        children?: Snippet;
    }

    let {
        id = crypto.randomUUID(),
        checked = $bindable(false),
        label,
        class: classes,
        children,
        ...rest
    }: Props = $props();
</script>

<label
    for={id}
    class={twMerge(
        "flex cursor-pointer items-center gap-4 has-disabled:cursor-not-allowed has-disabled:opacity-50",
        classes,
    )}
>
    <input {id} bind:checked type="checkbox" class="peer sr-only" {...rest} />
    <div
        class="peer-focus-visible:outline-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors peer-focus-visible:ring-2 peer-focus-visible:outline-offset-2
        {checked ? 'border-primary bg-primary' : 'border-secondary bg-transparent'}"
    >
        <svg
            viewBox="0 0 12 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="h-3 w-3 transition-opacity {checked ? 'opacity-100' : 'opacity-0'}"
        >
            <path
                d="M1 5L4.5 8.5L11 1"
                stroke="var(--color-secondary)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
    </div>
    {#if label}
        <span class="text-content">{label}</span>
    {/if}
    {@render children?.()}
</label>
