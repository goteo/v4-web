<script lang="ts">
    import { t } from "../../i18n/store";
    import { formatCurrency } from "../../utils/currencies";
    import MinusIcon from "../icons/actions/MinusIcon.svelte";
    import PlusIcon from "../icons/actions/PlusIcon.svelte";
    import Trash from "../icons/actions/Trash.svelte";

    import type { CheckoutItem } from "../../stores/checkoutsStore";

    export let item: CheckoutItem;
    export let onIncrement: (item: CheckoutItem) => void;
    export let onDecrement: (item: CheckoutItem) => void;
    export let onRemove: (item: CheckoutItem) => void;

    function handleDecrement() {
        if (item.quantity === 1) {
            onRemove(item);
        } else {
            onDecrement(item);
        }
    }
</script>

<div
    class="border-grey flex w-full items-center gap-6 rounded-4xl border bg-white p-4 shadow-sm md:gap-7 md:p-5"
>
    <div
        class="border-grey flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[23.5px] border bg-orange-200 md:h-39.75 md:w-39.75"
    >
        {#if item.cover}
            <img
                src={item.cover}
                alt={item.reward?.title ?? item.title}
                class="h-full w-full object-cover object-center"
            />
        {:else}
            <span class="text-xl md:text-2xl">🙂</span>
        {/if}
    </div>

    <div class="flex min-w-0 flex-1 flex-col gap-1 md:gap-2">
        <p class="text-secondary text-lg font-bold md:text-[28px]">
            {formatCurrency(item.money.amount, item.money.currency)}
        </p>
        <p class="text-secondary truncate text-sm font-bold md:text-base">{item.title}</p>
        <p class="text-content text-xs md:text-sm">
            {#if item.kind === "reward"}
                {#if item.reward?.unitsClaimed! > 0}
                    {$t("pages.checkout.reward.claimed", {
                        units: item.reward?.unitsClaimed!,
                    })}
                {:else}
                    {$t("pages.checkout.reward.unclaimed")}
                {/if}
            {/if}
        </p>
    </div>

    <div class="flex shrink-0 items-center gap-3 md:gap-4">
        <div class="flex items-center gap-3 md:gap-4">
            <button
                type="button"
                onclick={handleDecrement}
                aria-label={$t("pages.checkout.decrement")}
                class="cursor-pointer"
            >
                <MinusIcon class="size-6" />
            </button>

            <span class="text-secondary w-6 text-center text-lg font-bold md:text-xl">
                {item.quantity}
            </span>

            <button
                type="button"
                onclick={() => onIncrement(item)}
                aria-label={$t("pages.checkout.increment")}
                class="cursor-pointer"
            >
                <PlusIcon class="size-6" />
            </button>
        </div>

        <button
            type="button"
            onclick={() => onRemove(item)}
            aria-label={$t("pages.checkout.remove")}
            class="cursor-pointer"
        >
            <Trash class="size-6" />
        </button>
    </div>
</div>
