<script lang="ts">
    import { actions } from "astro:actions";

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
    let editingHero = $state<HomeHeroRecord | null>(hero);
    let heroesList = $state(heroes);

    function handleTabChange(tabId: string) {
        currentSubtab = tabId;

        // Re-fetch every time the history is opened, so it always shows the
        // latest blocks regardless of when they were saved.
        if (tabId === "history") {
            refreshHeroes();
        }
    }

    function handleEdit(row: HomeHeroRecord) {
        editingHero = row;
        currentSubtab = "fields";
    }

    // The list is passed in once by the page; after a save it must be refreshed
    // so the history shows the new block without a full page reload.
    async function refreshHeroes() {
        try {
            const { data, error } = await actions.getHomeHeroData();

            if (error) {
                errorMessage = error.message;
                showError = true;
                return;
            }

            heroesList = data?.heroes ?? heroesList;
        } catch (e) {
            errorMessage = e instanceof Error ? e.message : String(e);
            showError = true;
        }
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
        <HeroForm hero={editingHero} onSaved={refreshHeroes} />
    {:else if currentSubtab === "history"}
        <HeroHistory
            rows={heroesList}
            onError={(message) => {
                errorMessage = message;
                showError = true;
            }}
            onEdit={handleEdit}
        />
    {/if}
</div>
