<script lang="ts">
    import { actions } from "astro:actions";
    import { Modal, TableBodyCell } from "flowbite-svelte";

    import { locale, t } from "../../../../i18n/store";
    import { formatDate } from "../../../../utils/dates";
    import HomeBanner from "../../../home/HomeBanner.svelte";
    import Trash from "../../../icons/actions/Trash.svelte";
    import Chevron from "../../../icons/navigation/Chevron.svelte";
    import DeleteModal from "../../../library/feedback/DeleteModal.svelte";
    import DataTable from "../../../library/tables/DataTable.svelte";
    import Title from "../../../library/typography/Title.svelte";

    import type { BannerRecord } from "../../../../repositories/banners";
    import type { DataTableHeader } from "../../../library/tables/DataTable.svelte";

    interface Props {
        rows: BannerRecord[];
        onError?: (message: string) => void;
    }

    let { rows, onError }: Props = $props();

    let list = $state(rows);

    const headers: DataTableHeader[] = [
        { key: "pages.admin.comm.banners.history.headers.title", sortable: false },
        { key: "pages.admin.comm.banners.history.headers.content", sortable: false },
        {
            key: "pages.admin.comm.banners.history.headers.publishedAt",
            sortable: false,
        },
        { key: "pages.admin.comm.banners.history.headers.endAt", sortable: false },
        { key: "", sortable: false, class: "w-35" },
    ];

    const itemsPerPage = 10;
    let currentPage = $state(1);

    const paginatedRows = $derived(
        list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    );

    let isLoading = $state(false);
    let isModalOpen = $state(false);
    let selectedRow = $state<BannerRecord | null>(null);

    let isDeleteModalOpen = $state(false);
    let rowToDelete = $state<BannerRecord | null>(null);

    function openModal(row: BannerRecord) {
        selectedRow = row;
        isModalOpen = true;
    }

    function closeModal() {
        isModalOpen = false;
        selectedRow = null;
    }

    function openDeleteModal(row: BannerRecord) {
        rowToDelete = row;
        isDeleteModalOpen = true;
    }

    async function confirmDelete() {
        const banner = rowToDelete;

        if (!banner) return;

        const formData = new FormData();
        formData.set("id", String(banner.id));

        const { error } = await actions.deleteBanner(formData);

        isDeleteModalOpen = false;
        rowToDelete = null;

        if (error) {
            onError?.(error.message);
            return;
        }

        list = list.filter((b) => b.id !== banner.id);

        // Deleting the last row of the last page would leave an empty table.
        if (currentPage > 1 && (currentPage - 1) * itemsPerPage >= list.length) {
            currentPage -= 1;
        }
    }
</script>

<div class="flex flex-col gap-4">
    <Title level={3} variant="subsection">
        {$t("pages.admin.comm.banners.history.title")}
    </Title>
    <p class="text-content">{$t("pages.admin.comm.banners.history.description")}</p>
</div>

<DataTable
    {headers}
    rows={paginatedRows}
    {isLoading}
    emptyMessage="pages.admin.comm.banners.history.noData"
    {currentPage}
    totalItems={list.length}
    {itemsPerPage}
    onPageChange={(page) => (currentPage = page)}
>
    {#snippet children(row)}
        <TableBodyCell
            class="border-variant1 max-w-80 truncate rounded-l-md border-t border-b border-l p-4"
        >
            {row.title}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 truncate border-t border-b p-4">
            {row.content}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            {formatDate(row.startsAt, $locale)}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            {formatDate(row.endsAt, $locale)}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 w-35 rounded-r-md border-t border-r border-b p-4">
            <div class="flex items-center gap-4">
                <button
                    class="flex cursor-pointer items-center gap-2"
                    onclick={() => openModal(row)}
                >
                    <span class="text-secondary self-center text-center underline">
                        {$t("pages.admin.comm.banners.history.actions.view")}
                    </span>
                    <Chevron direction="right" class="size-4" />
                </button>
                <button
                    class="text-secondary cursor-pointer transition-transform duration-200 hover:scale-110"
                    aria-label={$t("common.delete")}
                    onclick={() => openDeleteModal(row)}
                >
                    <Trash class="size-5" />
                </button>
            </div>
        </TableBodyCell>
    {/snippet}
</DataTable>

<Modal
    open={isModalOpen}
    onclose={closeModal}
    size="lg"
    class="flex w-full max-w-224.5 flex-col gap-6 rounded-3xl bg-white p-6 shadow-lg"
    closeBtnClass="absolute top-4 right-4 text-secondary cursor-pointer hover:scale-110 transition-transform duration-200 hover:bg-transparent"
    headerClass="md:p-0 p-0 border-b-0"
    bodyClass="md:p-0 p-0 border-b-0"
>
    {#snippet header()}
        {#if selectedRow}
            <div class="flex flex-col justify-start gap-4">
                <Title level={2} variant="subsection">
                    {$t("pages.admin.comm.banners.history.modal.title", {
                        date: formatDate(selectedRow.dateCreated, $locale),
                    })}
                </Title>
                <p class="text-content text-base font-normal">
                    {$t("pages.admin.comm.banners.history.modal.description")}
                </p>
            </div>
        {/if}
    {/snippet}
    {#if selectedRow}
        <HomeBanner
            title={selectedRow.title}
            description={selectedRow.content}
            ctaText={selectedRow.ctaText}
            ctaLink={selectedRow.ctaLink}
            closeAriaLabel={$t("pages.home.banner.closeAriaLabel")}
        />
    {/if}
</Modal>

<DeleteModal
    bind:open={isDeleteModalOpen}
    title={$t("pages.admin.comm.banners.history.deleteModal.title")}
    description={$t("pages.admin.comm.banners.history.deleteModal.description")}
    onclick={confirmDelete}
/>
