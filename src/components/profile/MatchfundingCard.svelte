<script lang="ts">
    import BaseActivityCard from "./BaseActivityCard.svelte";
    import { formatAmountWithSymbol } from "../../utils/currencies";

    import type { MatchfundingCardData } from "../../types/me-page";

    interface Props {
        /**
         * Current language locale
         */
        lang: string;

        /**
         * Optional matchfunding data for filled state
         * If undefined/null, card is not shown
         */
        data?: MatchfundingCardData;
    }

    let { lang, data }: Props = $props();

    const hasData = $derived(!!(data && data.totalCalls > 0));
    const formattedTotal = $derived(
        data?.totalDonated
            ? formatAmountWithSymbol(data.totalDonated.amount, data.totalDonated.currency, lang)
            : "",
    );
</script>

{#if hasData}
    <BaseActivityCard
        titleKey="pages.me.matchfunding.card.title"
        leftStatLabel="pages.me.matchfunding.card.calls"
        leftStatValue={data?.totalCalls ?? 0}
        rightStatLabel="pages.me.matchfunding.card.donated"
        rightStatValue={formattedTotal}
        recentTitleKey="pages.me.matchfunding.card.recent"
        illustrationPath="/images/profile/ilustration-matchfunding.png"
        primaryActionLabel="pages.me.matchfunding.card.viewAll"
        primaryActionHref="/me#matchfunding"
        isEmpty={false}
    >
        {#if data?.recentCalls}
            {#each data.recentCalls.slice(0, 2) as call}
                <li class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-semibold text-black">
                        {formatAmountWithSymbol(
                            call.donationAmount.amount,
                            call.donationAmount.currency,
                            lang,
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
{/if}
