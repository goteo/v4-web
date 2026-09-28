<script lang="ts">
    import { t } from "../../i18n/store";
    import { formatAmountWithSymbol } from "../../utils/currencies";
    import Title from "../library/typography/Title.svelte";

    import type { MatchfundingCall } from "../../types/me-page";

    interface Props {
        /**
         * Current language locale
         */
        lang: string;

        /**
         * Matchfunding call data
         */
        call: MatchfundingCall;
    }

    let { lang, call }: Props = $props();

    const formattedDonation = $derived(
        call?.donationAmount
            ? formatAmountWithSymbol(call.donationAmount.amount, call.donationAmount.currency, lang)
            : "",
    );

    /* GOTEO-MATCHFUNDING-CALL: the matchfunding layer exists in the API but the front-end call
       page is not shipped yet. Re-enable when the route exists. Do not delete.
    const callUrl = $derived(`/matchfunding/${call.slug}`);
    */
</script>

<!-- Hero-style Matchfunding Card -->
<div
    class="relative box-border flex w-full flex-col items-start justify-center gap-2 overflow-hidden rounded-4xl px-0 py-8 md:py-12 lg:py-16"
>
    <!-- Background Image -->
    {#if call.imageUrl}
        <div aria-hidden="true" class="pointer-events-none absolute inset-0 rounded-4xl">
            <div class="absolute inset-0 overflow-hidden rounded-4xl">
                <img
                    alt=""
                    src={call.imageUrl}
                    class="absolute top-0 left-0 size-full object-cover"
                />
            </div>
        </div>
    {/if}

    <!-- Content Container -->
    <div
        class="relative z-10 box-border flex w-full flex-col items-center gap-6 px-6 py-0 md:flex-row md:gap-8 md:px-10 lg:px-16"
    >
        <!-- Left Content: Title, Stats, Button -->
        <div
            class="flex min-h-0 min-w-0 flex-1 flex-col items-start justify-end gap-6 md:gap-8 lg:gap-10"
        >
            <!-- Title and Stats Section -->
            <div class="flex w-full flex-col gap-4">
                <!-- Title -->
                <div class="flex w-full flex-col gap-2">
                    <Title
                        level={3}
                        variant="section"
                        color="white"
                        class="min-w-full leading-tight"
                    >
                        {call.title}
                    </Title>
                </div>

                <!-- Stats Row (Horizontal on desktop, vertical on mobile) -->
                <div class="flex w-full flex-col items-start gap-4 md:h-16 md:flex-row md:gap-6">
                    <!-- Donation Amount -->
                    <div class="flex flex-col items-start text-white">
                        <p class="text-base leading-normal font-normal">
                            {$t("pages.me.matchfunding.callCard.donationCall")}
                        </p>
                        <p class="text-2xl leading-snug font-bold md:text-3xl">
                            {formattedDonation}
                        </p>
                    </div>

                    <!-- Participating Projects -->
                    <div class="flex flex-col items-start text-white">
                        <p class="text-base leading-normal font-normal">
                            {$t("pages.me.matchfunding.callCard.participatingProjects")}
                        </p>
                        <p class="text-2xl leading-snug font-bold md:text-3xl">
                            {call.participatingProjects}
                            {$t("pages.me.matchfunding.callCard.projects")}
                        </p>
                    </div>

                    <!-- Successful Projects -->
                    <div class="flex flex-col items-start text-white">
                        <p class="text-base leading-normal font-normal">
                            {$t("pages.me.matchfunding.callCard.successfulProjects")}
                        </p>
                        <p class="text-2xl leading-snug font-bold md:text-3xl">
                            {call.successfulProjects}
                            {$t("pages.me.matchfunding.callCard.projects")}
                        </p>
                    </div>
                </div>
            </div>

            <!-- GOTEO-MATCHFUNDING-CALL: CTA hidden until the matchfunding call page exists.
                 Re-enable together with `callUrl`. Do not delete.
            <a
                href={callUrl}
                class="bg-variant1 text-secondary focus:ring-primary flex items-center justify-center gap-2 rounded-3xl px-6 py-4 text-base leading-normal font-bold no-underline transition-all duration-200 hover:opacity-90 focus:ring-2 focus:outline-none"
            >
                {$t("pages.me.matchfunding.callCard.viewCall")}
            </a>
            -->
        </div>

        <!-- Right: Logo Card -->
        {#if call.logo}
            <div
                class="border-grey flex size-48 shrink-0 flex-col items-center justify-center gap-2 rounded-4xl border border-solid bg-white p-8 md:size-56 lg:size-64"
            >
                <div class="relative aspect-[250/124] w-full shrink-0">
                    <img
                        alt={call.title}
                        src={call.logo}
                        class="pointer-events-none absolute inset-0 size-full max-w-none object-contain object-center"
                    />
                </div>
            </div>
        {/if}
    </div>
</div>
