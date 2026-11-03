<script lang="ts">
    import { t } from "../../i18n/store";
    import { checkoutHydrated, cartAmount as total } from "../../stores/checkoutsStore";
    import { formatCurrency } from "../../utils/currencies";
    import { subtractMoney } from "../../utils/money";
    import Spinner from "../icons/status/Spinner.svelte";

    export let accounting;
</script>

<div class="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div class="text-center sm:text-left">
        <span class="block text-sm text-gray-600">{$t("pages.checkout.wallet.currentBalance")}</span
        >
        <p class="text-secondary text-double font-bold">
            {formatCurrency(accounting.balance)}
        </p>
    </div>

    <div class="text-center sm:text-left">
        <span class="block text-sm text-gray-600">{$t("pages.checkout.wallet.amountToUse")} </span>
        <p id="cart-total" class="text-double font-bold text-red-500">
            {#if $checkoutHydrated}
                {formatCurrency($total)}
            {:else}
                <Spinner />
            {/if}
        </p>
    </div>

    <div class="text-center sm:text-left">
        <span class="block text-sm text-gray-600"
            >{$t("pages.checkout.wallet.remainingBalance")}
        </span>
        <p id="cart-difference" class="text-secondary text-double font-bold">
            {#if $checkoutHydrated}
                {formatCurrency(subtractMoney(accounting.balance, $total))}
            {:else}
                <Spinner />
            {/if}
        </p>
    </div>
</div>
