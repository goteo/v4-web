<script lang="ts">
    import { get } from "svelte/store";

    import { cart, clearForUser } from "../../stores/checkoutsStore";

    let {
        userId,
        checkoutId,
    }: {
        userId?: number;
        checkoutId: string;
    } = $props();

    /**
     * Submits the paid cart items to `/api/checkout/rewardClaims`, where the items are
     * matched to the checkout's GatewayCharges and the ProjectRewardClaims are
     * created. Running that on the server means a page close mid-request cannot
     * leave the claims half-done: once this request is sent, the endpoint
     * completes every claim on its own.
     */
    async function claimRewards() {
        try {
            // Guard: a finalised cart must never be re-claimed. The store's
            // soft-delete keeps the items around (just flags `finalised:
            // true`), so without this there would be nothing stopping the
            // $effect below from re-submitting the same claims forever.
            const currentCart = get(cart);
            if (currentCart.finalised === true) return;

            const items = Object.values(currentCart.items);

            const hasRewards = items.some(
                (item) => item.kind === "reward" && item.reward?.id != null,
            );

            if (!hasRewards) return;

            const response = await fetch("/api/checkout/rewardClaims", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ checkoutId, items }),
            });

            if (!response.ok) {
                throw new Error(`Claims endpoint replied ${response.status}`);
            }

            const { failed, unmatched }: { failed: number; unmatched: number } =
                await response.json();

            // Only clear the user's cart once every claim succeeded. Unmatched
            // items and rejected claims keep the cart intact so the data can be
            // inspected and a later run re-tries — claims that already exist are
            // idempotent, so re-trials are safe.
            if (failed > 0 || unmatched > 0) {
                throw new Error(`Claims not created — failed: ${failed}, unmatched: ${unmatched}`);
            }

            if (userId != null) clearForUser(userId);
        } catch (err) {
            console.error("[RewardClaims] error:", err);
        }
    }

    // Submit claims when the cart holds rewards. The `clearForUser` above
    // finalises the cart, so later effect runs exit early on the `!hasRewards`
    // or `finalised` guards.
    $effect(() => {
        if (
            Object.values(get(cart).items).some(
                (item) => item.kind === "reward" && item.reward?.id != null,
            )
        ) {
            void claimRewards();
        }
    });
</script>
