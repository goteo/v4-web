<!--
Campaign Card Component (Svelte version)
Displays campaign information in a card format with responsive sizing
Converted from CampaignCard.astro to maintain exact functionality
-->
<script lang="ts">
    import { twMerge } from "tailwind-merge";

    import Clock from "../../components/icons/Clock.svelte";
    import { t } from "../../i18n/store";
    import { apiAccountingsIdGet, type Money } from "../../openapi/client";
    import { getDaysRemaining } from "../../utils/campaign";
    import { formatCurrency } from "../../utils/currencies";
    import { extractId } from "../../utils/extractId";
    import { gte } from "../../utils/money";
    import { PUBLIC_STATUSES_TO_STATUSES } from "../../utils/projectStatus";
    import Flames from "../icons/status/Flames.svelte";
    import Ok from "../icons/status/Ok.svelte";
    import Button from "../library/buttons/Button.svelte";
    import Tag from "../library/tags/Tag.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { Campaign, CampaignSize } from "../../types/campaign";
    import type { OwnedCardAction } from "../../utils/ownedProjectCards";

    export interface OwnedCardActionView {
        key: string;
        label: string;
        kind: OwnedCardAction["kind"];
    }

    export interface OwnedCardConfig {
        tagLabel?: string;
        showMoney?: boolean;
        actions?: OwnedCardActionView[];
    }

    interface Props {
        size: CampaignSize;
        campaign: Campaign;
        showUserDonations?: boolean;
        showOwnerActions?: boolean;
        ownedConfig?: OwnedCardConfig;
        class?: string;
    }

    let {
        size,
        campaign,
        showUserDonations = false,
        showOwnerActions = false,
        ownedConfig,
        class: className = "",
    }: Props = $props();

    // Falls back to fetching the balance from the accounting IRI when the caller pre-loads no
    // `obtained`. Derived, not assigned in the effect, because effects don't run during SSR: a card
    // rendered statically (no `client:*` of its own) would ignore the pre-loaded value and show
    // "loading" forever — those callers must pre-load it.
    let fetched = $state<Money | undefined>(undefined);
    const obtained = $derived(campaign.obtained ?? fetched);

    $effect(() => {
        if (fetched === undefined && !campaign.obtained && campaign.accounting) {
            apiAccountingsIdGet({ path: { id: extractId(campaign.accounting)! } })
                .then(({ data }) => {
                    if (data?.balance) fetched = data.balance as Money;
                })
                .catch((error) => console.error("Error fetching campaign balance:", error));
        }
    });

    // Large cards span 2 columns in md+, full width on mobile
    const sizeClasses = $derived(size === "large" ? "col-span-1 md:col-span-2" : "col-span-1");

    const hasReachedMinimum = $derived(
        obtained != null && campaign.minimum != null ? gte(obtained, campaign.minimum) : false,
    );

    const isFinished = $derived(
        [...PUBLIC_STATUSES_TO_STATUSES.funded, ...PUBLIC_STATUSES_TO_STATUSES.archived].includes(
            campaign.status ?? "",
        ),
    );
    const daysRemaining = $derived(getDaysRemaining(campaign.calendar));
    const hasMatchfunding = $derived(
        campaign.hasMatchfunding ?? !!campaign.matchCallSubmissions?.length,
    );

    // Two-phase bar: red fill towards the minimum; once reached it resets to a full green first
    // third plus a green fill towards the optimum (additive on top of the minimum). Overflow is
    // clamped so it never shows.
    const ratio = (part = 0, total = 0) => (total > 0 ? Math.min(Math.max(part / total, 0), 1) : 1);
    const barFill = $derived.by(() => {
        const raised = obtained?.amount ?? 0;
        const minimum = campaign.minimum?.amount ?? 0;
        return hasReachedMinimum
            ? ratio(raised - minimum, campaign.optimum?.amount)
            : ratio(raised, minimum);
    });

    // Right-hand amount: the minimum until it's reached, then the optimum
    const goal = $derived(
        campaign.optimum && hasReachedMinimum
            ? { key: "optimum", money: campaign.optimum }
            : { key: "minimum", money: campaign.minimum },
    );
</script>

<div
    class={twMerge(
        "border-grey grow basis-0 rounded-4xl border bg-white px-4 pt-4 pb-6 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] md:p-6",
        sizeClasses,
        className,
    )}
    data-testid="campaign-card"
>
    <a href="/project/{campaign.slug}">
        <div class="flex flex-col gap-6">
            <div class="relative">
                <img
                    src={campaign.image}
                    alt={campaign.title}
                    class="h-80 w-full rounded-3xl object-cover md:h-97.25"
                />

                <div class="absolute top-4 left-4 flex flex-wrap gap-2">
                    {#if ownedConfig?.tagLabel}
                        <Tag variant="bold">{ownedConfig.tagLabel}</Tag>
                    {/if}
                    {#if isFinished}
                        <Tag variant="bold">
                            <Ok width={16} height={16} />
                            <span>{$t("pages.home.campaigns.finished")}</span>
                        </Tag>
                    {:else if daysRemaining !== undefined}
                        <Tag variant="bold">
                            <Clock width={16} height={16} />
                            <span>
                                {$t("pages.home.campaigns.daysRemaining", { days: daysRemaining })}
                            </span>
                        </Tag>
                    {/if}
                    {#if hasMatchfunding}
                        <Tag variant="bold">
                            <Flames width={16} height={16} />
                            <span>{$t("pages.home.campaigns.matchfunding")}</span>
                        </Tag>
                    {/if}
                    {#each campaign.tags ?? [] as tag}
                        <Tag variant="bold">{tag}</Tag>
                    {/each}
                </div>

                {#if hasReachedMinimum}
                    <span
                        class="border-secondary text-secondary absolute bottom-4 left-4 rounded-lg border bg-white px-2 py-1 text-xs font-medium"
                    >
                        {$t("pages.home.campaigns.minimumExceeded")}
                    </span>
                {/if}
            </div>

            <div class="flex flex-col gap-4">
                <Title
                    level={3}
                    variant="subsection"
                    color="secondary"
                    class="line-clamp-2 h-16 leading-8"
                >
                    {campaign.title}
                </Title>

                {#if !ownedConfig || ownedConfig.showMoney !== false}
                    {#if obtained}
                        <div class="flex h-4 gap-1">
                            {#if hasReachedMinimum}
                                <div class="bg-primary h-full w-1/3 rounded-2xl"></div>
                            {/if}
                            <div
                                class="border-variant1 h-full flex-1 overflow-hidden rounded-2xl border bg-white"
                            >
                                <div
                                    class="h-full rounded-2xl {hasReachedMinimum
                                        ? 'bg-primary'
                                        : 'bg-tertiary'}"
                                    style="width: {barFill * 100}%"
                                ></div>
                            </div>
                        </div>
                    {/if}

                    <div class="flex items-start justify-between text-black">
                        <div class="flex flex-col gap-1">
                            <span class="text-base">{$t("pages.home.campaigns.obtained")}</span>
                            <span class="text-2xl leading-8 font-bold">
                                {#if obtained}
                                    {formatCurrency(obtained)}
                                {:else}
                                    <span class="text-content text-sm">{$t("system.loading")}</span>
                                {/if}
                            </span>
                        </div>
                        <div class="flex flex-col gap-1 text-right">
                            <span class="text-base">{$t(`pages.home.campaigns.${goal.key}`)}</span>
                            <span class="text-2xl leading-8 font-bold">
                                {formatCurrency(goal.money)}
                            </span>
                        </div>
                    </div>
                {/if}

                <!-- User Donations Footer -->
                {#if showUserDonations && campaign.userDonations}
                    <div
                        class="bg-primary -mx-6 -mb-6 flex items-center justify-between rounded-b-3xl px-6 py-4"
                    >
                        <span class="text-base font-normal text-black"
                            >{$t("pages.home.campaigns.userDonations")}</span
                        >
                        <span class="text-2xl font-bold text-black">
                            {formatCurrency(campaign.userDonations)}
                        </span>
                    </div>
                {/if}

                <!-- Owned project actions (status-based) -->
                {#if ownedConfig?.actions}
                    <div class="flex w-full flex-col gap-4 md:flex-row">
                        {#each ownedConfig.actions as action}
                            <Button kind={action.kind} class="flex-1">
                                {action.label}
                            </Button>
                        {/each}
                    </div>
                {:else if showOwnerActions}
                    <div class="flex w-full gap-4">
                        <button
                            class="border-secondary text-secondary hover:bg-secondary flex-1 rounded-3xl border px-4 py-4 text-base font-bold transition-colors hover:text-white"
                        >
                            {$t("pages.me.ownedProjects.messageToDonatorsButton")}
                        </button>
                        <button
                            class="bg-variant1 text-secondary hover:bg-purple-soft flex-1 rounded-3xl px-4 py-4 text-base font-bold transition-colors"
                        >
                            {$t("pages.me.ownedProjects.uploadNewsButton")}
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    </a>
</div>
