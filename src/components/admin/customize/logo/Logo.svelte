<script lang="ts">
    import { actions } from "astro:actions";
    import { untrack } from "svelte";

    import LogoForm from "./LogoForm.svelte";
    import LogoHistory from "./LogoHistory.svelte";
    import LogoTabs from "./LogoTabs.svelte";
    import { t } from "../../../../i18n/store";
    import Toast from "../../../library/feedback/Toast.svelte";
    import Title from "../../../library/typography/Title.svelte";

    import type { HeaderLogoRecord } from "../../../../repositories/headerLogo";

    interface Props {
        logos: HeaderLogoRecord[];
    }

    let { logos }: Props = $props();

    let currentSubtab = $state("new");
    let showError = $state(false);
    let errorMessage = $state("");
    let logosList = $state(untrack(() => logos));

    function handleTabChange(tabId: string) {
        currentSubtab = tabId;

        // Re-fetch every time the history is opened, so it always shows the
        // latest logos regardless of when they were saved.
        if (tabId === "history") {
            refreshLogos();
        }
    }

    // The list is passed in once by the page; after a save it must be refreshed
    // so the history shows the new logo without a full page reload.
    async function refreshLogos() {
        try {
            const { data, error } = await actions.getHeaderLogoData();

            if (error) {
                errorMessage = error.message;
                showError = true;
                return;
            }

            logosList = data?.logos ?? logosList;
        } catch (e) {
            errorMessage = e instanceof Error ? e.message : String(e);
            showError = true;
        }
    }

    async function handleSaved() {
        await refreshLogos();
        currentSubtab = "history";
    }
</script>

<div class="flex flex-col gap-4">
    <Title level={2} variant="headline">
        {$t("pages.admin.customize.logo.title")}
    </Title>
    <p class="text-content text-base font-normal">
        {$t("pages.admin.customize.logo.description")}
    </p>
</div>

<Toast floating variant="error" bind:showToast={showError}>{errorMessage}</Toast>

<div class="flex flex-col gap-6">
    <LogoTabs currentTab={currentSubtab} onTabChange={handleTabChange} />
    {#if currentSubtab === "new"}
        <LogoForm onSaved={handleSaved} />
    {:else if currentSubtab === "history"}
        <LogoHistory
            rows={logosList}
            onError={(message: string) => {
                errorMessage = message;
                showError = true;
            }}
            onSaved={refreshLogos}
        />
    {/if}
</div>
