<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import Button from "./Button.svelte";
    import Check from "../../icons/actions/Check.svelte";
    import Spinner from "../../icons/status/Spinner.svelte";

    import type { Snippet } from "svelte";
    import type { HTMLButtonAttributes } from "svelte/elements";

    export type ActionableState = "actionable" | "loading" | "actioned";

    interface Props extends Omit<HTMLButtonAttributes, "class" | "onclick"> {
        children: Snippet;
        actionedChildren?: Snippet;
        class?: ClassNameValue;
        size?: "md" | "sm";
        kind?: "primary" | "secondary" | "ghost" | "invert";
        action: () => Promise<void>;
        state?: ActionableState;
        /* Time, in milliseconds, from actioned to reset */
        autoreset?: number;
    }

    let {
        children: renderChildren,
        actionedChildren,
        type = "button",
        class: classes = "",
        size = "md",
        kind = "primary",
        action,
        autoreset,
        state = $bindable("actionable"),
        ...rest
    }: Props = $props();

    async function handleClick() {
        if (state !== "actionable") return;
        state = "loading";
        try {
            await action();
        } catch (err) {
            // A failed action can be retried, so it never reaches the actioned state
            state = "actionable";
            console.error(err);
            return;
        }
        state = "actioned";
        if (autoreset !== undefined) {
            setTimeout(() => (state = "actionable"), autoreset);
        }
    }

    export function reset() {
        state = "actionable";
    }
</script>

<Button
    {type}
    {size}
    {kind}
    class={twMerge("relative w-full", classes)}
    disabled={state !== "actionable"}
    onclick={handleClick}
    {...rest}
>
    <span class={state !== "actionable" ? "invisible" : ""}>
        {@render renderChildren()}
    </span>

    {#if state === "loading"}
        <span class="absolute inset-0 flex items-center justify-center">
            <Spinner />
        </span>
    {:else if state === "actioned"}
        <span class="absolute inset-0 flex items-center justify-center">
            {#if actionedChildren}
                {@render actionedChildren()}
            {:else}
                <Check />
            {/if}
        </span>
    {/if}
</Button>
