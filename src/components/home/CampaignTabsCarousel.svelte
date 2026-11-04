<script lang="ts">
    import CampaignCard from "./CampaignCard.svelte";
    import CampaignsTabsNav from "./CampaignsTabsNav.svelte";
    import { t } from "../../i18n/store";
    import Carousel from "../library/layout/Carousel.svelte";

    import type { ProposedCampaignTab } from "../../repositories/proposedCampaigns";
    import type { Campaign } from "../../types/campaign";

    interface Props {
        campaignsByTab: Partial<Record<ProposedCampaignTab, Campaign[]>>;
    }

    let { campaignsByTab }: Props = $props();

    let activeTab = $state<ProposedCampaignTab>("ending-soon");

    let activeCampaigns = $derived(campaignsByTab[activeTab] ?? []);

    function handleTabChange(tabId: string) {
        activeTab = tabId as ProposedCampaignTab;
    }
</script>

<div class="flex flex-col gap-6">
    <CampaignsTabsNav {activeTab} onTabChange={handleTabChange} alignment="center" />

    {#if activeCampaigns.length > 0}
        <Carousel itemsPerGroup={3} gap={24} showDots={false}>
            {#each activeCampaigns as campaign (campaign.slug)}
                <CampaignCard size="small" {campaign} />
            {/each}
        </Carousel>
    {:else}
        <p class="text-content text-base font-normal">{$t("common.noData")}</p>
    {/if}
</div>
