<script lang="ts">
    import BaseActivityCard from "./BaseActivityCard.svelte";
    import { locale, t } from "../../i18n/store";
    import {
        apiAccountingsIdGet,
        apiMatchCallsGetCollection,
    } from "../../openapi/client/sdk.gen.ts";
    import { getDefaultCurrency } from "../../utils/consts";
    import { formatAmountWithSymbol } from "../../utils/currencies";
    import { extractId } from "../../utils/extractId";
    import { toCollectionItems } from "../../utils/hydra.ts";
    import { sumMoney } from "../../utils/money";
    import LoadingSpinner from "../search/LoadingSpinner.svelte";

    import type { MatchCall, User } from "../../openapi/client/types.gen.ts";
    import type { MatchfundingCardData } from "../../types/me-page";

    interface Props {
        /**
         * Authenticated user whose matchfunding calls are listed
         */
        user: User;

        /**
         * Notifies the parent whether the card has data, so the layout can
         * decide how many grid columns to use.
         */
        onHasData?: (hasData: boolean) => void;
    }

    let { user, onHasData }: Props = $props();

    let data = $state<Promise<MatchfundingCardData | undefined>>();

    const MATCH_CALLS_PER_PAGE = 30;

    type MatchCallsCollection = {
        member?: MatchCall[];
        "hydra:member"?: MatchCall[];
        totalItems?: number;
        "hydra:totalItems"?: number;
    };

    async function fetchMatchfunding(): Promise<MatchfundingCardData> {
        const headers = {
            "Accept-Language": $locale,
        };

        // Fetch all match calls for this user (filtered by manager server-side),
        // paging through with JSON-LD to get the real total, since all of them are
        // needed to sum their accountings.
        const allCalls: MatchCall[] = [];
        let currentPage = 1;
        let totalItems = 0;

        do {
            const { data: callsData, error: callsError } = await apiMatchCallsGetCollection({
                baseUrl: "/api/relay",
                query: {
                    "managers.id": user.id,
                    page: currentPage,
                    itemsPerPage: MATCH_CALLS_PER_PAGE,
                } as any,
                headers: {
                    Accept: "application/ld+json",
                    ...headers,
                },
            });

            if (callsError) {
                console.warn("Failed to fetch matchfunding calls:", callsError);
                throw callsError;
            }

            const collection = (callsData as unknown as MatchCallsCollection) ?? {};
            allCalls.push(...toCollectionItems<MatchCall>(collection));
            totalItems = collection.totalItems ?? collection["hydra:totalItems"] ?? allCalls.length;
            currentPage++;
        } while (allCalls.length < totalItems);

        const calls = allCalls;

        if (calls.length === 0) {
            return {
                totalCalls: 0,
                totalDonated: { amount: 0, currency: getDefaultCurrency() },
                recentCalls: [],
            };
        }

        // Fetch accounting data for each call to get donation amounts
        const callAccountings = await Promise.all(
            calls.map(async (call) => {
                const accountingId = extractId(call.accounting);
                if (!accountingId)
                    return {
                        callId: call.id,
                        amount: 0,
                        currency: getDefaultCurrency(),
                    };

                try {
                    const { data: accounting } = await apiAccountingsIdGet({
                        baseUrl: "/api/relay",
                        path: { id: accountingId },
                        headers,
                    });

                    return {
                        callId: call.id,
                        amount: accounting?.balance?.amount || 0,
                        currency: accounting?.balance?.currency || getDefaultCurrency(),
                    };
                } catch {
                    return {
                        callId: call.id,
                        amount: 0,
                        currency: getDefaultCurrency(),
                    };
                }
            }),
        );

        // Calculate total donated across all calls
        const totalDonatedMoney = sumMoney(
            callAccountings.map((acc) => ({
                amount: acc.amount,
                currency: acc.currency,
            })),
        );
        const totalDonated = totalDonatedMoney.amount ?? 0;
        const currency = totalDonatedMoney.currency ?? getDefaultCurrency();

        // Get recent calls (up to 3)
        const recentCalls = calls.slice(0, 3).map((call, index) => ({
            id: call.id || 0,
            title: call.title || "",
            donationAmount: {
                amount: callAccountings[index]?.amount || 0,
                currency: callAccountings[index]?.currency || getDefaultCurrency(),
            },
        }));

        return {
            totalCalls: calls.length,
            totalDonated: {
                amount: totalDonated,
                currency,
            },
            recentCalls,
        };
    }

    $effect(() => {
        data = fetchMatchfunding();
    });

    // Notify the parent whether the card rendered data, so the grid columns can adapt
    $effect(() => {
        data?.then((summary) => {
            onHasData?.(!!(summary && summary.totalCalls > 0));
        });
    });
</script>

{#if data}
    {#await data}
        <!-- Loading state -->
        <div
            class="border-grey flex min-h-96 items-center justify-center rounded-4xl border bg-white"
        >
            <div class="flex items-center gap-2">
                <LoadingSpinner />
                <p class="text-content">{$t("system.loading")}</p>
            </div>
        </div>
    {:then summary}
        <BaseActivityCard
            titleKey="pages.me.matchfunding.card.title"
            leftStatLabel="pages.me.matchfunding.card.calls"
            leftStatValue={summary?.totalCalls ?? 0}
            rightStatLabel="pages.me.matchfunding.card.donated"
            rightStatValue={summary?.totalDonated
                ? formatAmountWithSymbol(
                      summary.totalDonated.amount,
                      summary.totalDonated.currency,
                      $locale,
                  )
                : ""}
            recentTitleKey="pages.me.matchfunding.card.recent"
            illustrationPath="/images/profile/ilustration-matchfunding.png"
            primaryActionLabel="pages.me.matchfunding.card.viewAll"
            primaryActionHref="/me#matchfunding"
            isEmpty={false}
        >
            {#if summary?.recentCalls}
                {#each summary.recentCalls.slice(0, 2) as call}
                    <li class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-black">
                            {formatAmountWithSymbol(
                                call.donationAmount.amount,
                                call.donationAmount.currency,
                                $locale,
                            )}
                        </span>
                        <span class="text-sm font-semibold text-black"> - </span>
                        <span class="text-content text-sm">
                            {call.title}
                        </span>
                    </li>
                {/each}
            {/if}
        </BaseActivityCard>
    {:catch matchfundingError}
        <div
            class="border-grey flex min-h-96 items-center justify-center rounded-4xl border bg-white"
        >
            <p class="text-tertiary font-semibold">{matchfundingError.message}</p>
        </div>
    {/await}
{:else}
    <!-- Loading state -->
    <div class="border-grey flex min-h-96 items-center justify-center rounded-4xl border bg-white">
        <div class="flex items-center gap-2">
            <LoadingSpinner />
            <p class="text-content">{$t("system.loading")}</p>
        </div>
    </div>
{/if}
