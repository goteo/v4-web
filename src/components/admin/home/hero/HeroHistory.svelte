<script lang="ts">
    import { actions } from "astro:actions";
    import { TableBodyCell } from "flowbite-svelte";
    import { tick } from "svelte";

    import HeroPreviewModal from "./HeroPreviewModal.svelte";
    import { locale, t } from "../../../../i18n/store";
    import { formatDate } from "../../../../utils/dates";
    import Eye from "../../../icons/media/Eye.svelte";
    import Close from "../../../icons/navigation/Close.svelte";
    import DeleteModal from "../../../library/feedback/DeleteModal.svelte";
    import ToggleSwitch from "../../../library/inputs/ToggleSwitch.svelte";
    import DataTable from "../../../library/tables/DataTable.svelte";
    import Tag from "../../../library/tags/Tag.svelte";
    import Title from "../../../library/typography/Title.svelte";

    import type { HomeHeroRecord } from "../../../../repositories/homeHero";
    import type { DataTableHeader } from "../../../library/tables/DataTable.svelte";

    interface Props {
        rows: HomeHeroRecord[];
        onError?: (message: string) => void;
        onDelete?: (id: number) => void;
    }

    let { rows, onError, onDelete }: Props = $props();

    type Filter = "all" | "upcoming";

    let filter: Filter = $state("all");

    // Same rule as the repository's getActive(): rows come newest first, so
    // the first one already started is the one the home shows.
    const activeId = $derived(rows.find((h) => h.startsAt.getTime() <= Date.now())?.id);

    type Status = "active" | "upcoming" | "past";

    function statusOf(row: HomeHeroRecord): Status {
        if (row.id === activeId) return "active";

        return row.startsAt.getTime() > Date.now() ? "upcoming" : "past";
    }

    const filtered = $derived(filter === "all" ? rows : rows.filter((h) => statusOf(h) !== "past"));

    const headers: DataTableHeader[] = [
        { key: "pages.admin.home.hero.history.headers.title", sortable: false },
        { key: "pages.admin.home.hero.history.headers.content", sortable: false },
        { key: "pages.admin.home.hero.history.headers.startsAt", sortable: false },
        { key: "pages.admin.home.hero.history.headers.status", sortable: false },
        { key: "", sortable: false, class: "w-24" },
    ];

    const itemsPerPage = 10;
    let currentPage = $state(1);

    const paginatedRows = $derived(
        filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    );

    function handleFilterChange() {
        currentPage = 1;
    }

    let isPreviewOpen = $state(false);
    let heroToPreview = $state<HomeHeroRecord | null>(null);

    function openPreview(row: HomeHeroRecord) {
        heroToPreview = row;
        isPreviewOpen = true;
    }

    let isDeleteModalOpen = $state(false);
    let rowToDelete = $state<HomeHeroRecord | null>(null);

    function openDeleteModal(row: HomeHeroRecord) {
        rowToDelete = row;
        isDeleteModalOpen = true;
    }

    async function confirmDelete() {
        const hero = rowToDelete;

        if (!hero) return;

        const formData = new FormData();
        formData.set("id", String(hero.id));

        const { error } = await actions.deleteHomeHero(formData);

        isDeleteModalOpen = false;
        rowToDelete = null;

        if (error) {
            onError?.(error.message);
            return;
        }

        onDelete?.(hero.id);

        // Let the parent's updated rows reach `filtered` before clamping.
        await tick();

        // Deleting the last row of the last page would leave an empty table.
        if (currentPage > 1 && (currentPage - 1) * itemsPerPage >= filtered.length) {
            currentPage -= 1;
        }
    }
</script>

<div class="flex flex-col gap-4">
    <Title level={3} variant="subsection">
        {$t("pages.admin.home.hero.history.title")}
    </Title>
    <p class="text-content">{$t("pages.admin.home.hero.history.description")}</p>
</div>

<ToggleSwitch
    bind:value={filter}
    class="w-fit"
    btnClass="px-6 py-1.5 text-sm whitespace-nowrap"
    options={[
        { value: "all", label: $t("pages.admin.home.hero.history.filter.all") },
        { value: "upcoming", label: $t("pages.admin.home.hero.history.filter.upcoming") },
    ]}
    onchange={handleFilterChange}
/>

<DataTable
    {headers}
    rows={paginatedRows}
    isLoading={false}
    emptyMessage="pages.admin.home.hero.history.noData"
    {currentPage}
    totalItems={filtered.length}
    {itemsPerPage}
    onPageChange={(page) => (currentPage = page)}
    onRowClick={openPreview}
>
    {#snippet children(row)}
        <TableBodyCell
            class="border-variant1 max-w-80 truncate rounded-l-md border-t border-b border-l p-4"
        >
            {row.title}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 max-w-80 truncate border-t border-b p-4">
            {row.content}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            {formatDate(row.startsAt, $locale)}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            {@const status = statusOf(row)}
            <Tag
                class="w-fit"
                variant={status === "active"
                    ? "success"
                    : status === "upcoming"
                      ? "warning"
                      : undefined}
            >
                {$t(`pages.admin.home.hero.history.status.${status}`)}
            </Tag>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 w-24 rounded-r-md border-t border-r border-b p-4">
            <div class="flex items-center gap-3">
                <button
                    class="text-secondary cursor-pointer transition-transform duration-200 hover:scale-110"
                    aria-label={$t("common.preview")}
                    onclick={(event) => {
                        event.stopPropagation();
                        openPreview(row);
                    }}
                >
                    <Eye class="size-5" />
                </button>
                <button
                    class="text-secondary cursor-pointer transition-transform duration-200 hover:scale-110"
                    aria-label={$t("common.delete")}
                    onclick={(event) => {
                        event.stopPropagation();
                        openDeleteModal(row);
                    }}
                >
                    <Close class="size-5" />
                </button>
            </div>
        </TableBodyCell>
    {/snippet}
</DataTable>

<HeroPreviewModal bind:open={isPreviewOpen} hero={heroToPreview} />

<DeleteModal
    bind:open={isDeleteModalOpen}
    title={$t("pages.admin.home.hero.history.deleteModal.title")}
    description={$t("pages.admin.home.hero.history.deleteModal.description")}
    onclick={confirmDelete}
/>
