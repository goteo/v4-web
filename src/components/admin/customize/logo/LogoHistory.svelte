<script lang="ts">
    import { actions } from "astro:actions";
    import { Modal, TableBodyCell } from "flowbite-svelte";
    import { tick, untrack } from "svelte";

    import { t } from "../../../../i18n/store";
    import Eye from "../../../icons/media/Eye.svelte";
    import Close from "../../../icons/navigation/Close.svelte";
    import DeleteModal from "../../../library/feedback/DeleteModal.svelte";
    import DataTable from "../../../library/tables/DataTable.svelte";
    import Title from "../../../library/typography/Title.svelte";

    import type { HeaderLogoRecord } from "../../../../repositories/headerLogo";
    import type { DataTableHeader } from "../../../library/tables/DataTable.svelte";

    interface Props {
        rows: HeaderLogoRecord[];
        onError?: (message: string) => void;
        onSaved?: () => void;
    }

    let { rows, onError, onSaved }: Props = $props();

    let list = $state(untrack(() => rows));

    // rows is refreshed after a save; keep the local list in sync, while the
    // local deletions below continue to apply on top of the incoming list.
    $effect(() => {
        list = rows;
    });

    // Same rule as the repository's getActive(): rows come newest first, so
    // the first one is the one the header shows.
    const activeId = $derived(list[0]?.id);

    type Status = "active" | "past";

    function statusOf(row: HeaderLogoRecord): Status {
        return row.id === activeId ? "active" : "past";
    }

    const STATUS_BADGES: Record<Status, string> = {
        active: "bg-green-100 text-green-800",
        past: "bg-gray-100 text-gray-500",
    };

    const headers: DataTableHeader[] = [
        { key: "pages.admin.customize.logo.history.headers.id", sortable: false, class: "w-16" },
        { key: "pages.admin.customize.logo.history.headers.image", sortable: false },
        { key: "pages.admin.customize.logo.history.headers.altText", sortable: false },
        { key: "pages.admin.customize.logo.history.headers.status", sortable: false },
        { key: "", sortable: false, class: "w-24" },
    ];

    const itemsPerPage = 10;
    let currentPage = $state(1);

    const paginatedRows = $derived(
        list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    );

    let isDeleteModalOpen = $state(false);
    let rowToDelete = $state<HeaderLogoRecord | null>(null);

    function openDeleteModal(row: HeaderLogoRecord) {
        rowToDelete = row;
        isDeleteModalOpen = true;
    }

    async function confirmDelete() {
        const logo = rowToDelete;

        if (!logo) return;

        const formData = new FormData();
        formData.set("id", String(logo.id));

        const { error } = await actions.deleteHeaderLogo(formData);

        isDeleteModalOpen = false;
        rowToDelete = null;

        if (error) {
            onError?.(error.message);
            return;
        }

        list = list.filter((item) => item.id !== logo.id);

        // The parent list is also refreshed so the header statuses follow.
        onSaved?.();

        // Let the updated rows reach the table before clamping.
        await tick();

        // Deleting the last row of the last page would leave an empty table.
        if (currentPage > 1 && (currentPage - 1) * itemsPerPage >= list.length) {
            currentPage -= 1;
        }
    }

    let isPreviewOpen = $state(false);
    let previewRow = $state<HeaderLogoRecord | null>(null);

    function openPreview(row: HeaderLogoRecord) {
        previewRow = row;
        isPreviewOpen = true;
    }
</script>

<div class="flex flex-col gap-4">
    <Title level={3} variant="subsection">
        {$t("pages.admin.customize.logo.history.title")}
    </Title>
    <p class="text-content">{$t("pages.admin.customize.logo.history.description")}</p>
</div>

<DataTable
    {headers}
    rows={paginatedRows}
    isLoading={false}
    emptyMessage="pages.admin.customize.logo.history.noData"
    {currentPage}
    totalItems={list.length}
    {itemsPerPage}
    onPageChange={(page) => (currentPage = page)}
>
    {#snippet children(row)}
        <TableBodyCell class="border-variant1 w-16 rounded-l-md border-t border-b border-l p-4">
            {row.id}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            <img
                src={row.mediaUrl}
                alt={row.altText}
                class="max-h-10 w-auto max-w-40 object-contain"
            />
        </TableBodyCell>
        <TableBodyCell class="border-variant1 max-w-80 truncate border-t border-b p-4">
            {row.altText}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            {@const status = statusOf(row)}
            <span
                class="flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap {STATUS_BADGES[
                    status
                ]}"
            >
                <span class="size-1.5 rounded-full bg-current"></span>
                {$t(`pages.admin.customize.logo.history.status.${status}`)}
            </span>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 w-24 rounded-r-md border-t border-r border-b p-4">
            <div class="flex items-center justify-end gap-3">
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
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex w-fit max-w-[min(46rem,calc(100vw-1rem))] -translate-x-1/2 -translate-y-1/2 divide-y-0 rounded-3xl bg-white shadow-lg backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    bodyClass="border-grey max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6"
>
    {#if previewRow}
        <div class="flex flex-col gap-4">
            <img
                src={previewRow.mediaUrl}
                alt={previewRow.altText}
                class="max-h-60 w-auto max-w-full object-contain"
            />
            <p class="text-content text-base">{previewRow.altText}</p>
        </div>
    {/if}
</Modal>

<DeleteModal
    bind:open={isDeleteModalOpen}
    title={$t("pages.admin.customize.logo.history.deleteModal.title")}
    description={$t("pages.admin.customize.logo.history.deleteModal.description")}
    onclick={confirmDelete}
/>
