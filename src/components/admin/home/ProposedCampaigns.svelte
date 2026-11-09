<script lang="ts">
    import { actions } from "astro:actions";

    import ProjectPickerModal, { type PickedProject } from "./ProjectPickerModal.svelte";
    import ProjectSlotCard from "./ProjectSlotCard.svelte";
    import { t } from "../../../i18n/store";
    import CampaignsTabsNav from "../../home/CampaignsTabsNav.svelte";
    import ActionableButton from "../../library/buttons/ActionableButton.svelte";
    import Toast from "../../library/feedback/Toast.svelte";
    import Grid from "../../library/layout/Grid.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { ProposedCampaignTab } from "../../../repositories/proposedCampaigns";

    interface SlotAssignment {
        tab: ProposedCampaignTab;
        position: number;
        // null project = empty slot (added from the grid, not yet filled)
        projectId: number | null;
        projectTitle: string | null;
        projectImage: string | null;
    }

    interface Props {
        config: {
            slots: SlotAssignment[];
        };
    }

    let { config }: Props = $props();

    let activeTab = $state<ProposedCampaignTab>("ending-soon");
    let pickerOpen = $state(false);
    let editingIndex = $state<number | null>(null);
    let showError = $state(false);
    let errorMessage = $state("");

    // Slots are grouped per tab; the array order within a tab is the display
    // order (top to bottom, left to right) and becomes the saved position.
    let slotsByTab = $state<Record<ProposedCampaignTab, SlotAssignment[]>>({
        "ending-soon": config.slots
            .filter((s) => s.tab === "ending-soon")
            .sort((a, b) => a.position - b.position),
        "most-successful": config.slots
            .filter((s) => s.tab === "most-successful")
            .sort((a, b) => a.position - b.position),
    });

    let activeSlots = $derived(slotsByTab[activeTab]);

    function handleTabChange(tabId: string) {
        activeTab = tabId as ProposedCampaignTab;
    }

    function openPicker(index: number) {
        editingIndex = index;
        pickerOpen = true;
    }

    function appendSlot() {
        const list = slotsByTab[activeTab];
        const empty: SlotAssignment = {
            tab: activeTab,
            position: list.length,
            projectId: null,
            projectTitle: null,
            projectImage: null,
        };
        slotsByTab = { ...slotsByTab, [activeTab]: [...list, empty] };
    }

    function handleConfirmPick(project: PickedProject) {
        if (editingIndex === null) return;

        const picked: SlotAssignment = {
            tab: activeTab,
            position: editingIndex,
            projectId: project.id,
            projectTitle: project.title,
            projectImage: project.image,
        };

        slotsByTab = {
            ...slotsByTab,
            [activeTab]: slotsByTab[activeTab].map((s, i) => (i === editingIndex ? picked : s)),
        };
        editingIndex = null;
    }

    function handleClearProject(index: number) {
        slotsByTab = {
            ...slotsByTab,
            [activeTab]: slotsByTab[activeTab].map((s, i) =>
                i === index ? { ...s, projectId: null, projectTitle: null, projectImage: null } : s,
            ),
        };
    }

    function handleRemoveSlot(index: number) {
        slotsByTab = {
            ...slotsByTab,
            [activeTab]: slotsByTab[activeTab].filter((_, i) => i !== index),
        };
    }

    async function handleSave() {
        const { error } = await actions.saveProposedCampaigns({
            "ending-soon": slotsByTab["ending-soon"]
                .map((s) => s.projectId)
                .filter((id): id is number => id !== null),
            "most-successful": slotsByTab["most-successful"]
                .map((s) => s.projectId)
                .filter((id): id is number => id !== null),
        });

        if (error) {
            errorMessage = error.message;
            showError = true;
        }
    }
</script>

<div class="flex flex-col gap-10">
    <header class="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
        <div class="flex max-w-150 flex-col gap-2">
            <Title level={2} variant="headline">{$t("pages.admin.home.proposed.title")}</Title>
            <p class="text-content text-base font-normal">
                {$t("pages.admin.home.proposed.description")}
            </p>
        </div>
        <ActionableButton action={handleSave} autoreset={2000} class="w-fit shrink-0 px-6">
            {$t("pages.admin.home.proposed.save")}
        </ActionableButton>
    </header>

    <section class="flex flex-col gap-6">
        <div class="flex flex-col gap-2">
            <Title level={3} variant="subsection">
                {$t("pages.admin.home.proposed.projects.title")}
            </Title>
            <p class="text-content text-body-small">
                {$t("pages.admin.home.proposed.projects.description")}
            </p>
        </div>

        <CampaignsTabsNav {activeTab} onTabChange={handleTabChange} alignment="left" />

        <Grid class="grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
            {#each activeSlots as slot, index (index)}
                <ProjectSlotCard
                    slotNumber={index + 1}
                    project={slot.projectId !== null && slot.projectTitle !== null
                        ? { title: slot.projectTitle, image: slot.projectImage }
                        : null}
                    onAdd={() => openPicker(index)}
                    onReplace={() => openPicker(index)}
                    onRemove={() => handleClearProject(index)}
                    onRemoveSlot={() => handleRemoveSlot(index)}
                />
            {/each}
            <ProjectSlotCard variant="add" onAdd={appendSlot} />
        </Grid>
    </section>
</div>

<Toast floating variant="error" bind:showToast={showError}>{errorMessage}</Toast>

<ProjectPickerModal
    bind:open={pickerOpen}
    title={$t("pages.admin.home.proposed.modal.title")}
    description={$t("pages.admin.home.proposed.modal.description")}
    searchLabel={$t("pages.admin.home.proposed.modal.search")}
    submitLabel={$t("pages.admin.home.proposed.modal.submit")}
    onConfirm={handleConfirmPick}
/>
