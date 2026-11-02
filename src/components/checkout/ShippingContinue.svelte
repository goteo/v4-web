<script lang="ts">
    import { t } from "../../i18n/store";
    import { shippingItems } from "../../stores/checkoutsStore";
    import Button from "../library/buttons/Button.svelte";

    // A claim without an address leaves the project owner nowhere to ship to.
    let missing = $derived($shippingItems.some((item) => !item.address));
</script>

<div class="flex w-full flex-col items-end gap-2">
    <Button href={missing ? undefined : "/checkout/payment"} disabled={missing} class="w-fit">
        {$t("common.continue")}
    </Button>
    {#if missing}
        <p class="text-content text-sm">{$t("pages.checkout.shipping.missing")}</p>
    {/if}
</div>
