<script lang="ts">
    import { actions } from "astro:actions";

    import ProjectPickerModal, { type PickedProject } from "./ProjectPickerModal.svelte";
    import ProjectSlotCard from "./ProjectSlotCard.svelte";
    import { t } from "../../../i18n/store";
    import ActionableButton from "../../library/buttons/ActionableButton.svelte";
    import Toast from "../../library/feedback/Toast.svelte";
    import RadioButton from "../../library/inputs/RadioButton.svelte";
    import Select from "../../library/inputs/Select.svelte";
    import Title from "../../library/typography/Title.svelte";

    interface SlotAssignment {
        position: number;
        projectId: number;
        projectTitle: string;
        projectImage: string | null;
    }

    interface Props {
        config: {
            highlight: {
                type: string;
                layout: string;
            } | null;
            slots: SlotAssignment[];
        };
    }

    let { config }: Props = $props();

    const LAYOUTS = [
        {
            id: "2x3",
            rows: [
                ["col-span-4", "col-span-2"],
                ["col-span-2", "col-span-2", "col-span-2"],
            ],
        },
        {
            id: "2x2",
            rows: [
                ["col-span-4", "col-span-2"],
                ["col-span-2", "col-span-4"],
            ],
        },
        {
            id: "3x2",
            rows: [
                ["col-span-2", "col-span-2", "col-span-2"],
                ["col-span-2", "col-span-4"],
            ],
        },
        {
            id: "3x3",
            rows: [
                ["col-span-2", "col-span-2", "col-span-2"],
                ["col-span-2", "col-span-2", "col-span-2"],
            ],
        },
    ];

    let type = $state(config.highlight?.type ?? "recent");
    let layout = $state(config.highlight?.layout ?? "2x3");
    let addOpen = $state(false);
    let editingSlotIndex = $state<number | null>(null);
    let showError = $state(false);
    let errorMessage = $state("");

    let slotAssignments = $state<SlotAssignment[]>(config.slots);

    let slotCount = $derived(LAYOUTS.find((l) => l.id === layout)?.rows.flat().length ?? 0);

    let slots = $derived(
        Array.from({ length: slotCount }, (_, i) => slotAssignments.find((a) => a.position === i)),
    );

    function handleAddProject(slotIndex: number) {
        editingSlotIndex = slotIndex;
        addOpen = true;
    }

    function handleConfirmAdd(project: PickedProject) {
        if (editingSlotIndex === null) return;
        slotAssignments = [
            ...slotAssignments.filter((a) => a.position !== editingSlotIndex),
            {
                position: editingSlotIndex,
                projectId: project.id,
                projectTitle: project.title,
                projectImage: project.image,
            },
        ];
        editingSlotIndex = null;
    }

    function handleRemoveProject(slotIndex: number) {
        slotAssignments = slotAssignments.filter((a) => a.position !== slotIndex);
    }

    async function handleSave() {
        const projectIds = slotAssignments
            .filter((a) => a.position < slotCount)
            .sort((a, b) => a.position - b.position)
            .map((a) => a.projectId);
        const { error } = await actions.saveHighlights({ type, layout, slots: projectIds });

        if (error) {
            errorMessage = error.message;
            showError = true;
        }
    }
</script>

<div class="flex flex-col gap-10">
    <header class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-2">
            <Title level={2} variant="headline">{$t("pages.admin.home.highlights.title")}</Title>
            <p class="text-content text-base">{$t("pages.admin.home.highlights.description")}</p>
        </div>
        <ActionableButton action={handleSave} autoreset={2000} class="w-fit shrink-0 px-6">
            {$t("common.save")}
        </ActionableButton>
    </header>

    <section class="flex flex-col gap-4">
        <Title level={3} variant="subsection">
            {$t("pages.admin.home.highlights.type.title")}
        </Title>
        <div class="max-w-100">
            <Select bind:value={type} labelText={$t("pages.admin.home.highlights.type.label")}>
                <option value="recent">{$t("pages.admin.home.highlights.type.recent")}</option>
            </Select>
        </div>
    </section>

    <section class="flex flex-col gap-4">
        <Title level={3} variant="subsection">
            {$t("pages.admin.home.highlights.grid.title")}
        </Title>
        <div class="grid gap-4 md:grid-cols-2">
            {#each LAYOUTS as option (option.id)}
                {@const selected = layout === option.id}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                    onclick={() => (layout = option.id)}
                    class="flex cursor-pointer flex-col gap-4 rounded-2xl border p-4 transition-colors duration-200 {selected
                        ? 'border-secondary bg-white shadow-sm'
                        : 'border-grey'}"
                >
                    <RadioButton
                        bind:group={layout}
                        value={option.id}
                        name="highlights-layout"
                        label={$t("pages.admin.home.highlights.grid.option", {
                            layout: option.id.replace("x", " x "),
                        })}
                    />
                    <div class="pointer-events-none flex flex-col gap-2">
                        {#each option.rows as row}
                            <div class="grid grid-cols-6 gap-2">
                                {#each row as span}
                                    <div
                                        class="h-21 rounded-lg {span} {selected
                                            ? 'bg-primary'
                                            : 'bg-grey'}"
                                    ></div>
                                {/each}
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    </section>

    <section class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
            <Title level={3} variant="subsection">
                {$t("pages.admin.home.highlights.projects.title")}
            </Title>
            <p class="text-content text-body-small">
                {$t("pages.admin.home.highlights.projects.description")}
            </p>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
            {#each slots as slot, index (index)}
                <ProjectSlotCard
                    slotNumber={index + 1}
                    project={slot ? { title: slot.projectTitle, image: slot.projectImage } : null}
                    onAdd={() => handleAddProject(index)}
                    onReplace={() => handleAddProject(index)}
                    onRemove={() => handleRemoveProject(index)}
                />
            {/each}
        </div>
    </section>
</div>

<Toast floating variant="error" bind:showToast={showError}>{errorMessage}</Toast>

<ProjectPickerModal
    bind:open={addOpen}
    title={$t("pages.admin.home.highlights.projects.modal.title")}
    description={$t("pages.admin.home.highlights.projects.modal.description")}
    searchLabel={$t("pages.admin.home.highlights.projects.modal.search")}
    submitLabel={$t("pages.admin.home.highlights.projects.modal.submit")}
    onConfirm={handleConfirmAdd}
/>
