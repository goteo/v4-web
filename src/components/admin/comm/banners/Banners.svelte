<script lang="ts">
    import BannersForm from "./BannersForm.svelte";
    import BannersHistory from "./BannersHistory.svelte";
    import BannersTabs from "./BannersTabs.svelte";
    import { t } from "../../../../i18n/store";
    import Toast from "../../../library/feedback/Toast.svelte";
    import Title from "../../../library/typography/Title.svelte";

    import type { BannerRecord } from "../../../../repositories/banners";

    interface Props {
        banners: BannerRecord[];
    }

    let { banners }: Props = $props();

    let currentSubtab = $state("fields");
    let showError = $state(false);
    let errorMessage = $state("");

    function handleTabChange(tabId: string) {
        currentSubtab = tabId;
    }
</script>

<div class="flex flex-col gap-4">
    <Title level={2} variant="headline">
        {$t("pages.admin.comm.banners.title")}
    </Title>
    <p class="text-content text-base font-normal">
        {$t("pages.admin.comm.banners.description")}
    </p>
</div>

<Toast floating variant="error" bind:showToast={showError}>{errorMessage}</Toast>

<div class="flex flex-col gap-6">
    <BannersTabs currentTab={currentSubtab} onTabChange={handleTabChange} />
    {#if currentSubtab === "fields"}
        <BannersForm />
    {:else if currentSubtab === "history"}
        <BannersHistory
            rows={banners}
            onError={(message) => {
                errorMessage = message;
                showError = true;
            }}
        />
    {/if}
</div>
