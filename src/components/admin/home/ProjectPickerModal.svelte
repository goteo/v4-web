<!--
    Project Picker Modal - reusable admin modal to search and pick a project.

    Searches the platform projects (debounced, min 2 chars) via the API relay
    and reports the chosen project through `onConfirm`. Closing the modal (or
    confirming) resets the search state.
-->
<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import { t } from "../../../i18n/store";
    import { apiProjectsGetCollection } from "../../../openapi/client/sdk.gen";
    import { toCollectionItems } from "../../../utils/hydra";
    import Button from "../../library/buttons/Button.svelte";
    import DropdownSearch from "../../library/dropdown/DropdownSearch.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { Project } from "../../../openapi/client/types.gen";
    import type { DropdownOption } from "../../library/dropdown/dropdown.types";

    export interface PickedProject {
        id: number;
        title: string;
        image: string | null;
    }

    interface Props {
        open: boolean;
        title: string;
        description?: string;
        searchLabel?: string;
        submitLabel?: string;
        onConfirm: (project: PickedProject) => void;
    }

    let {
        open = $bindable(false),
        title,
        description,
        searchLabel,
        submitLabel,
        onConfirm,
    }: Props = $props();

    let projectQuery = $state("");
    let selectedOption = $state<DropdownOption[]>([]);
    let searchResults: Project[] = [];

    // Reset the search state every time the modal opens, so a previous pick
    // never lingers when it is reused for another slot.
    $effect(() => {
        if (open) {
            projectQuery = "";
            selectedOption = [];
            searchResults = [];
        }
    });

    async function searchProjects(title: string, signal: AbortSignal): Promise<DropdownOption[]> {
        const { data, error } = await apiProjectsGetCollection({
            baseUrl: "/api/relay",
            headers: { Accept: "application/ld+json" },
            query: { title, itemsPerPage: 10 },
            signal,
        });

        if (error) console.error("Project search failed:", error);

        const results = toCollectionItems<Project>(data);
        // A superseded search must not replace the results `handleConfirm` looks into.
        if (!signal.aborted) searchResults = results;

        return results.map((p) => ({
            id: String(p.id),
            label: p.title ?? p.slug ?? "",
            selected: false,
        }));
    }

    function handleConfirm() {
        if (selectedOption.length === 0) return;
        const chosen = selectedOption[0];
        const project = searchResults.find((p) => String(p.id) === chosen.id);
        onConfirm({
            id: Number(chosen.id),
            title: chosen.label,
            image: project?.video?.thumbnail ?? project?.cover ?? null,
        });
        open = false;
    }
</script>

<Modal
    bind:open
    closeBtnClass="top-3 end-3 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex w-full max-w-172 -translate-x-1/2 -translate-y-1/2 flex-col gap-6 divide-y-0 overflow-visible rounded-3xl bg-white p-6 shadow-lg backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    headerClass="md:p-0 p-0 border-none"
    bodyClass="md:p-0 p-0 border-none overflow-y-visible"
    footerClass="md:p-0 p-0 border-none flex items-center justify-end gap-4"
>
    {#snippet header()}
        <Title level={2} variant="subsection">{title}</Title>
    {/snippet}
    <div class="flex flex-col gap-6">
        {#if description}
            <p class="text-content text-base font-normal">{description}</p>
        {/if}
        <div class="relative">
            {#if projectQuery && searchLabel}
                <span
                    class="text-secondary absolute top-0 left-4 z-10 -translate-y-1/2 transform bg-white px-1 text-sm font-medium"
                >
                    {searchLabel}
                </span>
            {/if}
            <DropdownSearch
                variant="basic"
                singleSelect
                clearable
                search={searchProjects}
                minChars={2}
                bind:selected={selectedOption}
                bind:value={projectQuery}
                searchClasses="rounded-3xl border-secondary shadow-none"
                placeholder={searchLabel ?? $t("common.search")}
            />
        </div>
    </div>
    {#snippet footer()}
        <Button kind="ghost" onclick={() => (open = false)} class="w-fit">
            {$t("common.cancel")}
        </Button>
        <Button onclick={handleConfirm} class="w-fit">{submitLabel ?? $t("common.add")}</Button>
    {/snippet}
</Modal>
