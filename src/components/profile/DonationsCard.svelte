<script lang="ts">
    import BaseActivityCard from "./BaseActivityCard.svelte";
    import { formatAmountWithSymbol } from "../../utils/currencies";

    import type { ActivityData } from "../../types/me-page";

    interface Props {
        /**
         * Current language locale
         */
        lang: string;

        /**
         * Optional activity data for filled state
         * If undefined/null, shows empty state
         */
        data?: ActivityData;
    }

    let { lang, data }: Props = $props();

    const fallbackProjectTitle = $derived(lang === "es" ? "Proyecto" : "Project");

    // Determine if this card has data
    const hasData = $derived(!!(data?.donations && data.donations.count > 0));

    // Get donations data
    const donationsData = $derived(data?.donations);

    // Formatted total
    const formattedTotal = $derived(
        donationsData?.total
            ? formatAmountWithSymbol(donationsData.total.amount, donationsData.total.currency, lang)
            : "",
    );
</script>

<!-- GOTEO-OC-DONATION-CERTIFICATE: secondary action "Solicitar certificado" is exclusive to the
     donation-certificate feature of Goteo under Fundación Platoniq, hidden in the open-core.
     Re-enable when a feature toggle exists. Do not delete.
     <BaseActivityCard ... secondaryActionLabel="pages.me.donations.certificate"
        secondaryActionHref="#" ... /> -->
<BaseActivityCard
    titleKey="pages.me.donations.title"
    leftStatLabel="pages.me.donations.count"
    leftStatValue={donationsData?.count ?? 0}
    rightStatLabel="pages.me.donations.total"
    rightStatValue={formattedTotal}
    recentTitleKey="pages.me.donations.recent"
    illustrationPath="/images/profile/ilustration-donations.png"
    primaryActionLabel="pages.me.donations.viewAll"
    primaryActionHref="/me#donated-projects"
    isEmpty={!hasData}
    emptyMessageKey="pages.me.donations.empty"
    emptyCtaLabel="pages.me.donations.explore"
    emptyCtaLink="/search?status[]=in_campaign"
>
    {#if donationsData?.recentDonations}
        {#each donationsData.recentDonations.slice(0, 2) as donation}
            <li class="flex flex-wrap items-center gap-2">
                <span class="text-sm font-semibold text-black">
                    {formatAmountWithSymbol(donation.amount.amount, donation.amount.currency, lang)}
                </span>
                <span class="text-sm font-semibold text-black"> - </span>
                {#if donation.projectSlug}
                    <a
                        href={`/project/${donation.projectSlug}`}
                        class="text-secondary text-sm no-underline hover:underline focus:underline focus:outline-none"
                    >
                        {donation.projectTitle || fallbackProjectTitle}
                    </a>
                {:else}
                    <span class="text-tertiary text-sm italic">
                        {donation.projectTitle || fallbackProjectTitle}
                    </span>
                {/if}
            </li>
        {/each}
    {/if}
</BaseActivityCard>
