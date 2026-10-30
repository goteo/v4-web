<script lang="ts">
    import Spinner from "../../components/icons/status/Spinner.svelte";
    import WarningIcon from "../../components/icons/status/Warning.svelte";
    import { t } from "../../i18n/store";
    import { cartAmount, cartByRecipient, checkoutHydrated } from "../../stores/checkoutsStore";
    import { formatCurrency } from "../../utils/currencies";
    import { multiplyMoney, sumMoney } from "../../utils/money";
    import CollapsibleBox from "../library/layout/CollapsibleBox.svelte";
    import Thtml from "../library/typography/Thtml.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { Money } from "../../openapi/client";

    interface Props {
        hasError?: boolean;
        /**
         * Overrides the cart total. Once a payment is settled the cart is no
         * longer the source of truth — and is about to be cleared — so the
         * caller passes the total actually charged.
         */
        total?: Money;
    }

    let { hasError = false, total }: Props = $props();

    const displayTotal = $derived(total ?? $cartAmount);

    const recipients = $derived(
        Object.entries($cartByRecipient).sort((a, b) => {
            if (a[0] < b[0]) return -1;
            if (a[0] > b[0]) return 1;
            return 0;
        }),
    );
</script>

<div class="flex w-full flex-col gap-6">
    <CollapsibleBox
        detailsId="checkout-details"
        isInitiallyCollapsed={false}
        buttonTextShow={$t("pages.checkout.summary.showDetails")}
        buttonTextHide={$t("pages.checkout.summary.hideDetails")}
    >
        {#snippet header()}
            <Title
                level={2}
                variant="subsection"
                color={hasError ? "default" : "secondary"}
                class={`flex items-center gap-2 ${hasError ? "text-tertiary lg:text-double" : "lg:text-double"}`}
                weight="semibold"
            >
                {#if hasError}
                    <span class="h-6 w-6">
                        <WarningIcon />
                    </span>
                {/if}
                {$t("pages.checkout.summary.total.title")}
            </Title>
            <p
                class={`text-double leading-tight font-bold lg:text-[3.5rem] ${hasError ? "text-tertiary" : "text-secondary"}`}
            >
                {#if total || $checkoutHydrated}
                    {formatCurrency(displayTotal)}
                {:else}
                    <Spinner />
                {/if}
            </p>
        {/snippet}

        {#snippet content()}
            <hr class="bg-secondary my-0 h-px border-none" />

            <div class="flex flex-col gap-2 pt-4">
                {#each recipients as [_, items]}
                    {@const name = items[0].recipientDisplayName}
                    {@const amount = sumMoney(items.map((i) => multiplyMoney(i.money, i.quantity)))}
                    <p>
                        <Thtml
                            key="pages.checkout.summary.toRecipient"
                            vars={{
                                amount: `<strong>${formatCurrency(amount)}</strong>`,
                                name: name,
                            }}
                        />
                    </p>
                {/each}
            </div>
        {/snippet}
    </CollapsibleBox>
</div>
