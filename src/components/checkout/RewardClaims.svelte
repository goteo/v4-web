<script lang="ts">
    import { get } from "svelte/store";

    import { apiProjectRewardClaimsPost, type GatewayCharge } from "../../openapi/client";
    import { client } from "../../openapi/client/client.gen";
    import {
        apiGatewayChargesIdGetUrl,
        apiProjectRewardsIdGetUrl,
    } from "../../openapi/client/operation-paths.gen";
    import { cart, clearForUser, type CheckoutItem } from "../../stores/checkoutsStore";

    let {
        userId,
        charges,
    }: {
        userId?: number;
        charges: GatewayCharge[];
    } = $props();

    /**
     * Pairs each cart item with the GatewayCharge that paid for it.
     *
     * The v4 payment API has no way to know that a charge pays for a Reward, so
     * the association must be recovered from the local cart. The charges come
     * from the checkout already fetched and validated in `verify.astro`, so
     * they carry the same fields the cart item was created with.
     */
    function pairRewardsToCharges(
        items: CheckoutItem[],
        charges: GatewayCharge[],
    ): Array<{ reward: string; charge: string }> {
        const pendingItems: CheckoutItem[] = [];
        const usedCharges = new Set<GatewayCharge>();

        const toClaim = (
            item: CheckoutItem,
            charge: GatewayCharge,
        ): { reward: string; charge: string } => ({
            reward: client.buildUrl({
                url: apiProjectRewardsIdGetUrl,
                path: { id: item.reward!.id },
            }),
            charge: client.buildUrl({
                url: apiGatewayChargesIdGetUrl,
                path: { id: charge.id },
            }),
        });

        const claims: Array<{ reward: string; charge: string }> = [];

        for (const item of items) {
            if (item.kind !== "reward" || item.reward?.id == null) continue;

            const match = charges.find(
                (charge) =>
                    !usedCharges.has(charge) &&
                    charge.target === item.target &&
                    charge.title === item.title &&
                    charge.type === item.type &&
                    charge.money.amount === item.money.amount &&
                    charge.money.currency === item.money.currency,
            );

            if (!match) {
                pendingItems.push(item);
                continue;
            }

            usedCharges.add(match);
            claims.push(toClaim(item, match));
        }

        // Items that did not match by fields fall back to the next unused
        // charge, relying on the 1:1 creation order preserved in the checkout.
        for (const item of pendingItems) {
            const next = charges.find((charge) => !usedCharges.has(charge));

            if (!next) {
                console.warn("No charge left for reward item:", item);
                continue;
            }

            usedCharges.add(next);
            claims.push(toClaim(item, next));
        }

        return claims;
    }

    async function claimRewards() {
        let allSucceeded = true;

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

            const claims = pairRewardsToCharges(items, charges);

            for (const claim of claims) {
                const { error } = await apiProjectRewardClaimsPost({
                    baseUrl: "/api/relay",
                    body: claim,
                });

                if (error) {
                    console.error("[RewardClaims] failed:", claim.reward, error);
                    throw new Error(
                        `[RewardClaims] claim for reward ${claim.reward} rejected`,
                    );
                }
            }
        } catch (err) {
            allSucceeded = false;
            console.error("[RewardClaims] error:", err);
        } finally {
            // Only clear the user's cart once every claim succeeded. If any
            // single claim was rejected mid-claim, the cart stays intact so
            // the $effect above re-runs against the same charges/chart data
            // once they change — never erasing the chance to re-try.
            if (allSucceeded && userId != null) clearForUser(userId);
        }
    }

    // Submit claims when the cart holds rewards (and re-submit if the
    // charges/cart they pair against change). The `finally` above clears the
    // user's cart, so later effect runs exit early on the `!hasRewards` guard.
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
