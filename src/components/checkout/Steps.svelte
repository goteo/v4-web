<script lang="ts">
    import { twJoin } from "tailwind-merge";

    import WarningIcon from "../../components/icons/status/Warning.svelte";
    import { t } from "../../i18n/store";
    import { checkoutHydrated, shippingItems } from "../../stores/checkoutsStore";

    const STEPS = ["reward", "data", "shipping", "payment", "confirmation"] as const;

    let {
        step = 1,
        hasError,
    }: {
        /** Position in the full flow, shipping included. */
        step?: number;
        hasError: boolean;
    } = $props();

    // Shipping is dropped once the cart is known to have nothing to ship.
    let steps = $derived(
        STEPS.filter(
            (key) => key !== "shipping" || !$checkoutHydrated || $shippingItems.length > 0,
        ),
    );
    let current = $derived(steps.indexOf(STEPS[step - 1]) + 1);
    let stepsLabels = $derived(steps.map((key) => $t(`pages.checkout.steps.${key}.title`)));
</script>

<div class="mb-6 w-full">
    <div class="relative">
        <div class="bg-variant1 h-4 w-full rounded-full"></div>

        <div
            class="bg-primary absolute top-0 left-0 h-4 rounded-full transition-all duration-500"
            style="width: {Math.min(
                ((2 * current - 1) / (2 * stepsLabels.length - 2)) * 100,
                100,
            )}%;"
        ></div>

        <div
            class="absolute top-1/2 flex w-full -translate-y-1/2 items-center justify-between px-2"
        >
            {#each stepsLabels.keys() as index}
                <div
                    class="border-secondary relative z-10 flex h-2 w-2 items-center justify-center rounded-full border-2 transition-all duration-300 lg:h-3 lg:w-3"
                    class:bg-secondary={index < current}
                    class:bg-variant1={index >= current}
                ></div>
            {/each}
        </div>
    </div>

    <!-- Same track as the dots, so each label sits under its own dot -->
    <div class="mt-4 flex w-full items-start justify-between px-2 text-sm font-bold text-gray-700">
        {#each stepsLabels as label, index}
            <div
                class="group flex w-2 shrink-0 justify-center first:justify-start last:justify-end lg:w-3"
            >
                <div
                    class={twJoin(
                        "flex w-max max-w-20 shrink-0 items-center gap-1 text-center group-first:-ml-2 group-first:text-left group-last:-mr-2 group-last:text-right",
                        current >= index + 1 ? "text-black" : "text-gray-400",
                    )}
                >
                    {#if current === index + 1 && hasError}
                        <WarningIcon class="h-4 w-4" />
                    {/if}
                    <span class="text-xs leading-tight">{label}</span>
                </div>
            </div>
        {/each}
    </div>
</div>
