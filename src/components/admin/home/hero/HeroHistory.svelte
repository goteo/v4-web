<script lang="ts">
    import { actions } from "astro:actions";
    import { Modal, TableBodyCell } from "flowbite-svelte";

    import HeroPreviewModal from "./HeroPreviewModal.svelte";
    import { locale, t } from "../../../../i18n/store";
    import { formatDate } from "../../../../utils/dates";
    import { getLanguageDisplayName } from "../../../../utils/lang";
    import { renderMarkdown } from "../../../../utils/renderMarkdown";
    import Hero from "../../../hero/Hero.svelte";
    import Edit from "../../../icons/actions/Edit.svelte";
    import SearchIcon from "../../../icons/actions/Search.svelte";
    import Close from "../../../icons/navigation/Close.svelte";
    import Eye from "../../../icons/media/Eye.svelte";
    import DeleteModal from "../../../library/feedback/DeleteModal.svelte";
    import Search from "../../../library/inputs/Search.svelte";
    import ToggleSwitch from "../../../library/inputs/ToggleSwitch.svelte";
    import DataTable from "../../../library/tables/DataTable.svelte";
    import Title from "../../../library/typography/Title.svelte";

    import type { HomeHeroRecord } from "../../../../repositories/homeHero";
    import type { DataTableHeader } from "../../../library/tables/DataTable.svelte";

    interface Props {
        rows: HomeHeroRecord[];
        onError?: (message: string) => void;
        onEdit?: (row: HomeHeroRecord) => void;
    }

    let { rows, onError, onEdit }: Props = $props();

    let list = $state(rows);

    // rows is refreshed after a save; keep the local list in sync, while the
    // local deletions below continue to apply on top of the incoming list.
    $effect(() => {
        list = rows;
    });

    type Filter = "all" | "upcoming";

    let filter: Filter = $state("all");

    // Same rule as the repository's getActive(): rows come newest first, so
    // the first one already started is the one the home shows.
    const activeId = $derived(list.find((h) => h.startsAt.getTime() <= Date.now())?.id);

    type Status = "active" | "upcoming" | "past";

    function statusOf(row: HomeHeroRecord): Status {
        if (row.id === activeId) return "active";

        return row.startsAt.getTime() > Date.now() ? "upcoming" : "past";
    }

    const STATUS_BADGES: Record<Status, string> = {
        active: "bg-green-100 text-green-800",
        upcoming: "bg-amber-100 text-amber-800",
        past: "bg-gray-100 text-gray-500",
    };

    let searchQuery = $state("");

    const filtered = $derived(
        list.filter((h) => {
            if (filter === "upcoming" && statusOf(h) === "past") {
                return false;
            }

            const query = searchQuery.trim().toLowerCase();

            if (!query) {
                return true;
            }

            return (
                String(h.id).includes(query) ||
                h.title.toLowerCase().includes(query) ||
                h.content.toLowerCase().includes(query)
            );
        }),
    );

    const headers: DataTableHeader[] = [
        { key: "pages.admin.home.hero.history.headers.id", sortable: false, class: "w-16" },
        { key: "pages.admin.home.hero.history.headers.title", sortable: false },
        { key: "pages.admin.home.hero.history.headers.content", sortable: false },
        { key: "pages.admin.home.hero.history.headers.startsAt", sortable: false },
        { key: "pages.admin.home.hero.history.headers.languages", sortable: false },
        { key: "pages.admin.home.hero.history.headers.status", sortable: false },
        { key: "", sortable: false, class: "w-36" },
    ];

    const itemsPerPage = 10;
    let currentPage = $state(1);

    const paginatedRows = $derived(
        filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    );

    function handleFilterChange() {
        currentPage = 1;
    }

    function handleSearch() {
        currentPage = 1;
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

        list = list.filter((h) => h.id !== hero.id);

        // Deleting the last row of the last page would leave an empty table.
        if (currentPage > 1 && (currentPage - 1) * itemsPerPage >= filtered.length) {
            currentPage -= 1;
        }
    }

    let isPreviewOpen = $state(false);
    let previewRow = $state<HomeHeroRecord | null>(null);

    function openPreview(row: HomeHeroRecord) {
        previewRow = row;
        isPreviewOpen = true;
    }
</script>

<div class="flex flex-col gap-4">
    <Title level={3} variant="subsection">
        {$t("pages.admin.home.hero.history.title")}
    </Title>
    <p class="text-content">{$t("pages.admin.home.hero.history.description")}</p>
</div>

<div class="flex flex-wrap items-center justify-between gap-4">
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

    <Search
        bind:value={searchQuery}
        oninput={handleSearch}
        class="sm:max-w-80"
        placeholder={$t("pages.admin.home.hero.history.searchPlaceholder")}
    />
</div>

<DataTable
    {headers}
    rows={paginatedRows}
    isLoading={false}
    emptyMessage="pages.admin.home.hero.history.noData"
    {currentPage}
    totalItems={filtered.length}
    {itemsPerPage}
    paginationPrefix="common.pagination"
    onPageChange={(page) => (currentPage = page)}
    onRowClick={openPreview}
>
    {#snippet children(row)}
        <TableBodyCell class="border-variant1 w-16 rounded-l-md border-t border-b border-l p-4">
            {row.id}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 max-w-80 truncate border-t border-b p-4">
            {row.title}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 max-w-80 truncate border-t border-b p-4">
            {row.content}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            {row.startsAt.getTime() === 0 ? "—" : formatDate(row.startsAt, $locale)}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            {(row.languages ?? [])
                .map((code: string) => getLanguageDisplayName(code) ?? code)
                .join(", ")}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            {@const status = statusOf(row)}
            <span
                class="flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap {STATUS_BADGES[
                    status
                ]}"
            >
                <span class="size-1.5 rounded-full bg-current"></span>
                {$t(`pages.admin.home.hero.history.status.${status}`)}
            </span>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 w-36 rounded-r-md border-t border-r border-b p-4">
            <div class="flex items-center justify-end gap-3">
                <button
                    class="text-secondary cursor-pointer transition-transform duration-200 hover:scale-110"
                    aria-label={$t("common.edit")}
                    onclick={() => onEdit?.(row)}
                >
                    <Edit class="size-5" />
                </button>
                <button
                    class="text-secondary cursor-pointer transition-transform duration-200 hover:scale-110"
                    aria-label={$t("common.preview")}
                    onclick={() => openPreview(row)}
                >
                    <Eye class="size-5" />
                </button>
                <button
                    class="text-secondary cursor-pointer transition-transform duration-200 hover:scale-110"
                    aria-label={$t("common.delete")}
                    onclick={() => openDeleteModal(row)}
                >
                    <Close class="size-5" />
                </button>
            </div>
        </TableBodyCell>
    {/snippet}
</DataTable>

<Modal
    bind:open={isPreviewOpen}
    closeBtnClass="top-7 end-7 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex w-full max-w-[90vw] -translate-x-1/2 -translate-y-1/2 divide-y-0 rounded-3xl bg-white shadow-lg backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    bodyClass="p-0"
>
    {#if previewRow}
        {#await renderMarkdown(previewRow.content) then html}
            <Hero hero={previewRow} content={html} />
        {/await}
    {/if}
</Modal>

<DeleteModal
    bind:open={isDeleteModalOpen}
    title={$t("pages.admin.home.hero.history.deleteModal.title")}
    description={$t("pages.admin.home.hero.history.deleteModal.description")}
    onclick={confirmDelete}
/>
