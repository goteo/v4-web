import {
    apiGatewayCheckoutsIdGet,
    apiProjectRewardClaimsGetCollection,
    apiProjectRewardClaimsPost,
} from "../../../openapi/client";
import { client } from "../../../openapi/client/client.gen";
import {
    apiGatewayChargesIdGetUrl,
    apiProjectRewardsIdGetUrl,
} from "../../../openapi/client/operation-paths.gen";
import { Unauthorized } from "../../../utils/responses";

import type { GatewayCharge } from "../../../openapi/client";
import type { CheckoutItem } from "../../../stores/checkoutsStore";
import type { APIRoute } from "astro";

/**
 * Creates the ProjectRewardClaim resources for the paid cart items.
 *
 * Matching cart items to GatewayCharges runs here, server-side, so the whole
 * claim flow survives the user closing the window mid-request: once the client
 * has POSTed the cart data, this endpoint completes every claim on its own.
 *
 * The charges are not trusted from the client — they are re-fetched from the
 * API through the user's session token, keyed by `checkoutId`.
 *
 * Request body: `{ "checkoutId": string, "items": CheckoutItem[] }`
 * Response body: `{ created, alreadyExists, failed, unmatched }`
 */
export const POST: APIRoute = async ({ request, locals }) => {
    const { session } = locals;
    if (!session) return Unauthorized;

    const { checkoutId, items } = (await request.json()) as {
        checkoutId?: string;
        items?: CheckoutItem[];
    };

    if (!checkoutId || !Array.isArray(items)) {
        return json({ error: 'Missing "checkoutId" or "items" in request body' }, 400);
    }

    const headers = session.token.asHttpHeaders;

    const { data: checkout, error: checkoutError } = await apiGatewayCheckoutsIdGet({
        path: { id: checkoutId },
        headers,
    });

    if (checkoutError || !checkout) {
        console.error("[RewardClaims] failed to fetch checkout", checkoutError);
        return json({ error: "Could not fetch checkout" }, 500);
    }

    const charges = checkout.charges ?? [];
    if (charges.length === 0) {
        return json({ error: "Checkout has no charges" }, 422);
    }

    const { claims, unmatched } = pairRewardsToCharges(items, charges);

    if (unmatched.length > 0) {
        // After field matching, the only way to have pending cart items without a
        // matching API charge is a failure in the matching itself. Log the input
        // data so it can be refined rather than guessing an association.
        console.error("[RewardClaims] no matching charge for cart items:", {
            unmatched,
            availableCharges: charges,
        });
    }

    const result = { created: 0, alreadyExists: 0, failed: 0, unmatched: unmatched.length };

    for (const claim of claims) {
        try {
            const { error } = await apiProjectRewardClaimsPost({ headers, body: claim });

            if (!error) {
                result.created++;
                continue;
            }
        } catch (err) {
            console.error("[RewardClaims] claim POST failed:", claim, err);
        }

        // A claim that already exists for the same charge+reward pair means the
        // previous run got there first. That is the outcome we want, so it counts
        // as a success — it is what makes re-trials of partially claimed carts safe.
        if (await claimExists(headers, claim)) {
            result.alreadyExists++;
        } else {
            result.failed++;
            console.error("[RewardClaims] claim not created:", claim);
        }
    }

    return json(result);
};

/**
 * Pairs each cart item with the GatewayCharge that paid for it.
 *
 * The v4 payment API has no way to know that a charge pays for a Reward, so
 * the association must be recovered from the local cart. The charges come from
 * the checkout fetched and validated in `verify.astro`, so they carry the same
 * fields the cart item was created with.
 */
function pairRewardsToCharges(
    items: CheckoutItem[],
    charges: GatewayCharge[],
): { claims: Array<{ reward: string; charge: string }>; unmatched: CheckoutItem[] } {
    const usedCharges = new Set<GatewayCharge>();
    const claims: Array<{ reward: string; charge: string }> = [];
    const unmatched: CheckoutItem[] = [];

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
            unmatched.push(item);
            continue;
        }

        usedCharges.add(match);
        claims.push({
            reward: client.buildUrl({
                url: apiProjectRewardsIdGetUrl,
                path: { id: item.reward.id },
            }),
            charge: client.buildUrl({
                url: apiGatewayChargesIdGetUrl,
                path: { id: match.id },
            }),
        });
    }

    return { claims, unmatched };
}

async function claimExists(
    headers: Record<string, unknown> | HeadersInit | undefined,
    claim: { reward: string; charge: string },
): Promise<boolean> {
    const { data } = await apiProjectRewardClaimsGetCollection({
        headers,
        query: { charge: claim.charge, reward: claim.reward, itemsPerPage: 1 },
    });

    return (data?.length ?? 0) > 0;
}

function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
