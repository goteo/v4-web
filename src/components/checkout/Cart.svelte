<script lang="ts">
    import CheckoutCartItem from "./CheckoutCartItem.svelte";
    import Tipjar from "./Tipjar.svelte";
    import { cart, cartByRecipient } from "../../stores/checkoutsStore";
    import * as tipping from "../../utils/tipping";
    import Title from "../library/typography/Title.svelte";

    function increment(item: { key: string; quantity: number }) {
        cart.updateQuantity(item.key, item.quantity + 1);
    }

    function decrement(item: { key: string; quantity: number }) {
        if (item.quantity > 1) {
            cart.updateQuantity(item.key, item.quantity - 1);
        }
    }

    function remove(item: { key: string }) {
        cart.removeItem(item.key);
    }

    function getItems() {
        let items = Object.entries($cartByRecipient);

        if (tipping.isEnabled) {
            items = items.filter((item) => item[0] !== tipping.tipjarIri);
        }

        return items;
    }
</script>

<div class="flex flex-col gap-10">
    {#each getItems() as [_target, items]}
        <div class="flex flex-col gap-6">
            <Title level={2} variant="subsection">
                {items[0].recipientDisplayName}
            </Title>

            {#each items as item (item.key)}
                <CheckoutCartItem
                    {item}
                    onIncrement={() => increment(item)}
                    onDecrement={() => decrement(item)}
                    onRemove={() => remove(item)}
                />
            {/each}
        </div>
    {/each}
</div>

{#if tipping.isEnabled}
    <Tipjar />
{/if}
