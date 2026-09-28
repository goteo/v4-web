<script lang="ts">
    import { actions } from "astro:actions";
    import { Modal } from "flowbite-svelte";

    import { t } from "../../../i18n/store";
    import { apiProjectsGetCollection } from "../../../openapi/client/sdk.gen";
    import { debounce } from "../../../utils/debounce";
    import { toCollectionItems } from "../../../utils/hydra";
    import ActionableButton from "../../library/buttons/ActionableButton.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import DropdownMenu from "../../library/dropdown/DropdownMenu.svelte";
    import Toast from "../../library/feedback/Toast.svelte";
    import RadioButton from "../../library/inputs/RadioButton.svelte";
    import Select from "../../library/inputs/Select.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { Project } from "../../../openapi/client/types.gen";
    import type { DropdownOption } from "../../library/dropdown/dropdown.types";

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
    let projectQuery = $state("");
    let searchOptions = $state<DropdownOption[]>([]);
    let selectedOption = $state<DropdownOption[]>([]);
    let editingSlotIndex = $state<number | null>(null);
    let searchResults: Project[] = [];
    let showError = $state(false);
    let errorMessage = $state("");

    let slotAssignments = $state<SlotAssignment[]>(config.slots);

    let slotCount = $derived(LAYOUTS.find((l) => l.id === layout)?.rows.flat().length ?? 0);

    let slots = $derived(
        Array.from({ length: slotCount }, (_, i) => slotAssignments.find((a) => a.position === i)),
    );

    const searchProjects = debounce(async (title: string) => {
        const { data, error } = await apiProjectsGetCollection({
            baseUrl: "/api/relay",
            headers: { Accept: "application/ld+json" },
            query: { title, itemsPerPage: 10 },
        });

        if (error) console.error("Project search failed:", error);

        searchResults = toCollectionItems<Project>(data);
        searchOptions = searchResults.map((p) => ({
            id: String(p.id),
            label: p.title ?? p.slug ?? "",
            selected: false,
        }));
    });

    function handleSearch(query: string) {
        const trimmed = query.trim();

        if (trimmed.length < 2) {
            searchProjects.cancel();
            searchOptions = [];
            return;
        }

        searchProjects(trimmed);
    }

    function handleAddProject(slotIndex: number) {
        editingSlotIndex = slotIndex;
        projectQuery = "";
        searchOptions = [];
        selectedOption = [];
        addOpen = true;
    }

    function handleConfirmAdd() {
        if (editingSlotIndex === null || selectedOption.length === 0) return;
        const chosen = selectedOption[0];
        const project = searchResults.find((p) => String(p.id) === chosen.id);
        slotAssignments = [
            ...slotAssignments.filter((a) => a.position !== editingSlotIndex),
            {
                position: editingSlotIndex,
                projectId: Number(chosen.id),
                projectTitle: chosen.label,
                projectImage: project?.video?.thumbnail ?? project?.cover ?? null,
            },
        ];
        addOpen = false;
        editingSlotIndex = null;
    }

    function handleRemoveProject(slotIndex: number) {
        slotAssignments = slotAssignments.filter((a) => a.position !== slotIndex);
    }

    async function handleSave() {
        const projectIds = slotAssignments
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
                <div class="border-grey flex flex-col items-start gap-2 rounded-2xl border p-4">
                    <p class="text-secondary font-bold">
                        {$t("pages.admin.home.highlights.projects.slot", {
                            number: String(index + 1).padStart(2, "0"),
                        })}
                    </p>
                    {#if slot}
                        {#if slot.projectImage}
                            <img
                                src={slot.projectImage}
                                alt={slot.projectTitle}
                                class="aspect-video w-full rounded-lg object-cover"
                            />
                        {/if}
                        <p class="text-content text-body-small font-medium">
                            {slot.projectTitle}
                        </p>
                        <div class="flex gap-2">
                            <Button
                                kind="secondary"
                                size="sm"
                                onclick={() => handleAddProject(index)}
                            >
                                {$t("pages.admin.home.highlights.projects.replace")}
                            </Button>
                            <Button
                                kind="ghost"
                                size="sm"
                                onclick={() => handleRemoveProject(index)}
                            >
                                {$t("pages.admin.home.highlights.projects.remove")}
                            </Button>
                        </div>
                    {:else}
                        <p class="text-content text-body-small">
                            {$t("pages.admin.home.highlights.projects.empty")}
                        </p>
                        <Button kind="secondary" size="sm" onclick={() => handleAddProject(index)}>
                            {$t("pages.admin.home.highlights.projects.add")}
                        </Button>
                    {/if}
                </div>
            {/each}
        </div>
    </section>
</div>

<Toast variant="error" bind:showToast={showError}>{errorMessage}</Toast>

<Modal
    bind:open={addOpen}
    closeBtnClass="top-3 end-3 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="fixed top-1/2 left-1/2 mx-2 flex w-full max-w-172 -translate-x-1/2 -translate-y-1/2 flex-col gap-6 divide-y-0 overflow-visible rounded-3xl bg-white p-6 shadow-lg backdrop:bg-[#878282B2] backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    headerClass="md:p-0 p-0 border-none"
    bodyClass="md:p-0 p-0 border-none overflow-y-visible"
    footerClass="md:p-0 p-0 border-none flex items-center justify-end gap-4"
>
    {#snippet header()}
        <Title level={2} variant="subsection">
            {$t("pages.admin.home.highlights.projects.modal.title")}
        </Title>
    {/snippet}
    <div class="flex flex-col gap-6">
        <p class="text-content text-base font-normal">
            {$t("pages.admin.home.highlights.projects.modal.description")}
        </p>
        <div class="relative">
            {#if projectQuery}
                <span
                    class="text-secondary absolute top-0 left-4 z-10 -translate-y-1/2 transform bg-white px-1 text-sm font-medium"
                >
                    {$t("pages.admin.home.highlights.projects.modal.search")}
                </span>
            {/if}
            <DropdownMenu
                variant="basic"
                hasSearch
                singleSelect
                clearable
                options={searchOptions}
                bind:selected={selectedOption}
                bind:searchValue={projectQuery}
                onSearch={handleSearch}
                searchClasses="rounded-3xl border-secondary shadow-none"
                searchPlaceholder={$t("pages.admin.home.highlights.projects.modal.search")}
            />
        </div>
    </div>
    {#snippet footer()}
        <Button kind="ghost" onclick={() => (addOpen = false)} class="w-fit">
            {$t("common.cancel")}
        </Button>
        <Button onclick={handleConfirmAdd} class="w-fit">
            {$t("pages.admin.home.highlights.projects.modal.submit")}
        </Button>
    {/snippet}
</Modal>
