<script lang="ts">
    import AddressModal from "./AddressModal.svelte";
    import { session } from "../../auth/store";
    import { locale, t } from "../../i18n/store";
    import { cart, checkoutHydrated, shippingItems } from "../../stores/checkoutsStore";
    import { getDefaultAddress } from "../../utils/defaultAddress";
    import { formatAddress } from "../../utils/formatAddress";
    import Button from "../library/buttons/Button.svelte";
    import Checkbox from "../library/inputs/Checkbox.svelte";

    import type { Address } from "../../openapi/client";
    import type { CheckoutItem } from "../../stores/checkoutsStore";

    let {
        addresses: knownAddresses,
        userIri,
    }: {
        /** The user's known addresses; the default one goes to every item at first. */
        addresses: Address[];
        userIri: string;
    } = $props();

    let created = $state<Address[]>([]);
    let addresses = $derived([...knownAddresses, ...created]);
    let defaultAddress = $derived(getDefaultAddress(addresses));
    let editing = $state<CheckoutItem>();
    let open = $state(false);

    let items = $derived($shippingItems);

    // Nothing to ship: this step does not apply. Waits for the session, since the cart
    // loads the guest record first and only switches to the user's one once it arrives.
    $effect(() => {
        if ($session && $checkoutHydrated && items.length === 0) {
            location.replace("/checkout/payment");
        }
    });

    // Items with no address, or one the user no longer has, ship to the default.
    $effect(() => {
        if (!defaultAddress) return;

        for (const item of items) {
            if (!addresses.some((address) => address.id === item.address?.id)) {
                cart.setAddress(item.key, defaultAddress);
            }
        }
    });

    function edit(item: CheckoutItem) {
        editing = item;
        open = true;
    }

    function select(address: Address) {
        if (!addresses.some((a) => a.id === address.id)) created = [...created, address];
        if (editing) cart.setAddress(editing.key, address);
    }

    function toggle(item: CheckoutItem, checked: boolean) {
        if (checked) edit(item);
        else if (defaultAddress) cart.setAddress(item.key, defaultAddress);
    }
</script>

<div class="flex flex-col gap-6">
    {#each items as item (item.key)}
        <!-- The checkbox and button inside keep their own handlers and stay keyboard reachable -->
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <div
            class="border-grey flex w-full cursor-pointer items-center gap-6 rounded-4xl border bg-white p-4 shadow-sm md:gap-7 md:p-5"
            onclick={(event) => {
                if (!(event.target as Element).closest("label, input, button")) edit(item);
            }}
        >
            <!-- Same cover as CheckoutCartItem -->
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

            <div class="flex min-w-0 flex-1 flex-col gap-3">
                <p class="text-secondary text-lg font-bold md:text-xl">
                    {item.reward?.title ?? item.title}
                </p>

                {#if item.address}
                    <p class="text-content text-base">{formatAddress(item.address, $locale)}</p>
                    <!-- Remount when the modal toggles, so a cancelled modal unticks the box -->
                    {#key open}
                        <Checkbox
                            class="text-sm"
                            label={$t("pages.checkout.changeAddressLabel")}
                            checked={item.address.id !== defaultAddress?.id}
                            onchange={(event) => toggle(item, event.currentTarget.checked)}
                        />
                    {/key}
                {:else}
                    <p class="text-content text-sm">{$t("pages.checkout.shipping.noAddress")}</p>
                    <Button kind="ghost" size="sm" class="w-fit" onclick={() => edit(item)}>
                        {$t("pages.checkout.shipping.addAddress")}
                    </Button>
                {/if}
            </div>
        </div>
    {/each}
</div>

<!-- Every address but the default: picking it would not be a different one -->
<AddressModal
    bind:open
    addresses={addresses.filter((address) => address.id !== defaultAddress?.id)}
    selected={editing?.address}
    {userIri}
    onSelect={select}
/>
