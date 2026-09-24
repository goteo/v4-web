<script lang="ts">
    import HeroForm from "./HeroForm.svelte";
    import HeroHistory from "./HeroHistory.svelte";
    import HeroTabs from "./HeroTabs.svelte";
    import { t } from "../../../../i18n/store";
    import Toast from "../../../library/feedback/Toast.svelte";
    import Title from "../../../library/typography/Title.svelte";

    import type { HomeHeroRecord } from "../../../../repositories/homeHero";

    interface Props {
        hero?: HomeHeroRecord | null;
        heroes: HomeHeroRecord[];
    }

    let { hero = null, heroes }: Props = $props();

    let currentSubtab = $state("fields");
    let showError = $state(false);
    let errorMessage = $state("");

    function handleTabChange(tabId: string) {
        currentSubtab = tabId;
    }
</script>

<div class="flex flex-col gap-4">
    <Title level={2} variant="headline">
        {$t("pages.admin.home.hero.title")}
    </Title>
    <p class="text-content text-base font-normal">
        {$t("pages.admin.home.hero.description")}
    </p>
</div>

<Toast variant="error" bind:showToast={showError}>{errorMessage}</Toast>

<div class="flex flex-col gap-6">
    <HeroTabs currentTab={currentSubtab} onTabChange={handleTabChange} />
    {#if currentSubtab === "fields"}
        <HeroForm {hero} />
    {:else if currentSubtab === "history"}
        <HeroHistory
            rows={heroes}
            onError={(message) => {
                errorMessage = message;
                showError = true;
            }}
        />
    {/if}
</div>
