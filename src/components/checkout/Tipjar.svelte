<script lang="ts">
    import { onMount } from "svelte";

    import { t } from "../../i18n/store";
    import { apiTipjarsIdGet, type MoneyInput } from "../../openapi/client";
    import { cart, cartByRecipient, type CheckoutItem } from "../../stores/checkoutsStore";
    import { DEFAULT_CURRENCY } from "../../utils/currencies";
    import * as tipping from "../../utils/tipping";
    import CurrencyInput from "../library/inputs/CurrencyInput.svelte";
    import Title from "../library/typography/Title.svelte";

    let money = $state<MoneyInput>({
        amount: Number(tipping.defaultAmount),
        currency: DEFAULT_CURRENCY,
    });

    let isChecked = $state(tipping.defaultChecked);

    const amountError = $derived(
        money.amount <= 0 ? $t("pages.checkout.tipjar.error.invalidAmount") : "",
    );

    onMount(() => {
        toggleTip();
    });

    async function getTip(): Promise<Omit<CheckoutItem, "key">> {
        if ($cartByRecipient[tipping.tipjarIri]) {
            return $cartByRecipient[tipping.tipjarIri][0];
        }

        const { data: tipjar } = await apiTipjarsIdGet({ path: { id: tipping.tipjarId } });

        return {
            kind: "tip",
            type: "single",
            quantity: 1,
            title: $t("domain.tipping.title"),
            money: { amount: Number(tipping.defaultAmount), currency: DEFAULT_CURRENCY },
            recipient: tipping.tipjarIri,
            recipientDisplayName: tipjar?.name!,
            target: tipjar?.accounting!,
        };
    }

    async function setTip(newMoney: MoneyInput) {
        const tip = await getTip();

        cart.addItem({
            ...tip,
            money: newMoney,
        });
    }

    function handleAmountChange(newMoney: MoneyInput) {
        money = newMoney;

        if (newMoney.amount <= 0) {
            return;
        }

        setTip(newMoney);
    }

    function toggleTip() {
        if (!isChecked) {
            const tip = $cartByRecipient[tipping.tipjarIri]?.[0];
            if (!tip) {
                return;
            }

            cart.removeItem(tip.key);
        } else {
            setTip(money);
        }
    }
</script>

<div class="flex w-auto flex-col gap-4">
    <div class="flex flex-col gap-2">
        <Title level={2} variant="subsection">
            {$t("pages.checkout.tipjar.community")}
        </Title>

        <CurrencyInput
            amount={money.amount}
            currency={money.currency}
            placeholder={$t("pages.checkout.tipjar.input")}
            disabled={!isChecked}
            error={amountError}
            onInput={handleAmountChange}
        />
    </div>

    <div>
        <div class="flex items-center gap-2">
            <input
                id="donation-checkbox"
                type="checkbox"
                class="accent-primary h-6 w-6 rounded"
                bind:checked={isChecked}
                onchange={() => toggleTip()}
            />
            <label for="donation-checkbox" class="text-secondary">
                {$t("pages.checkout.tipjar.checkboxLabel")}
            </label>
        </div>
    </div>
</div>
