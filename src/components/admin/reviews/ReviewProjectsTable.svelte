<script lang="ts" module>
    import type { Project } from "../../../openapi/client/index.ts";
    import type { DataTableHeader } from "../../library/tables/DataTable.svelte";

    export type ProjectStatus = NonNullable<Project["status"]>;

    export type ReviewProjectRow = {
        id: number;
        name: string;
        slug: string;
        promoter: string;
        promoterHandle: string;
        email: string;
        status: ProjectStatus;
        dateCreated: string;
        dateUpdated: string;
        dateRelease: string;
        minOptim: string;
        /** Identifier of the campaign review this project has, when the API has launched it. */
        reviewId?: number;
    };

    const headers: DataTableHeader[] = [
        { key: "pages.admin.reviews.projects.table.headers.name" },
        { key: "pages.admin.reviews.projects.table.headers.promoter" },
        { key: "pages.admin.reviews.projects.table.headers.dateSubmitted" },
        { key: "pages.admin.reviews.projects.table.headers.status" },
        { key: "pages.admin.reviews.projects.table.headers.advisor" },
        { key: "", class: "w-12" },
    ];
</script>

<script lang="ts">
    import { TableBodyCell } from "flowbite-svelte";

    import { t, locale } from "../../../i18n/store";
    import { ADMIN_ITEMS_PER_PAGE_OPTIONS } from "../../../utils/adminTable";
    import { formatDate } from "../../../utils/dates";
    import { CAMPAIGN_REVIEW_STATUSES } from "../../../utils/projectStatus";
    import Comments from "../../icons/Comments.svelte";
    import Chevron from "../../icons/navigation/Chevron.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import DataTable from "../../library/tables/DataTable.svelte";
    import DetailsRow, { type DetailsField } from "../DetailsRow.svelte";
    import {
        PROJECT_ITEMS_PER_PAGE_LABEL,
        projectSortOptions,
        type ProjectSortKey,
    } from "../projects/ProjectsTable.svelte";

    interface Props {
        projects: ReviewProjectRow[];
        currentPage: number;
        totalItems: number;
        itemsPerPage: number;
        isLoading: boolean;
        selectedSort: ProjectSortKey;
        onPageChange?: (page: number) => void;
        onItemsPerPageChange?: (perPage: number) => void;
        onSortChange?: (sort: ProjectSortKey) => void;
        onStatusChange?: (projectId: number, status: ProjectStatus) => void;
    }

    let {
        projects,
        currentPage,
        totalItems,
        itemsPerPage,
        isLoading,
        selectedSort,
        onPageChange,
        onItemsPerPageChange,
        onSortChange,
        onStatusChange,
    }: Props = $props();

    let openRow = $state<number | null>(null);

    const statusLabel = (status: string) =>
        $t(`domain.project.status.${status.replaceAll(".", "_")}`);

    const date = (value: string) => (value ? formatDate(new Date(value), $locale) : "—");

    function detailFields(project: ReviewProjectRow): DetailsField[] {
        const label = (key: string) => $t(`pages.admin.reviews.projects.table.rows.details.${key}`);
        // ponytail: phone, risk, pending messages and advisor have no API yet — placeholders
        return [
            { label: label("email"), value: project.email || "—" },
            { label: label("phone"), value: "—" },
            { label: label("dateRelease"), value: date(project.dateRelease) },
            { label: label("dateCreated"), value: date(project.dateCreated) },
            { label: label("lastInteraction"), value: date(project.dateUpdated) },
            { label: label("risk"), value: "—" },
            { label: label("pendingMessages"), value: "—" },
            { label: label("minOptim"), value: project.minOptim },
        ];
    }

    const btnLabel = (key: string) =>
        $t(`pages.admin.reviews.projects.table.rows.details.btns.${key}`);
</script>

<DataTable
    {headers}
    rows={projects}
    {isLoading}
    emptyMessage="pages.admin.projects.table.rows.noData"
    {currentPage}
    {totalItems}
    {itemsPerPage}
    itemsPerPageLabel={PROJECT_ITEMS_PER_PAGE_LABEL}
    itemsPerPageOptions={[...ADMIN_ITEMS_PER_PAGE_OPTIONS]}
    sortOptions={projectSortOptions}
    {selectedSort}
    sortLabel="pages.admin.projects.filters.order.title"
    {onPageChange}
    {onItemsPerPageChange}
    onSort={(k) => onSortChange?.(k as ProjectSortKey)}
    onRowClick={(_row, i) => (openRow = openRow === i ? null : i)}
    bind:expandedRowIndex={openRow}
>
    {#snippet children(project: ReviewProjectRow, i: number)}
        <TableBodyCell class="border-variant1 max-w-60 rounded-l-md border-t border-b border-l p-4">
            <p class="text-content truncate">{project.name}</p>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 text-content border-t border-b p-4">
            <span class="block truncate">{project.promoter}</span>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 text-content border-t border-b p-4">
            {date(project.dateUpdated)}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            <div onclick={(e) => e.stopPropagation()} role="presentation">
                <select
                    class="border-secondary text-secondary bg-purple-soft w-full rounded-sm border py-1 text-sm"
                    value={project.status}
                    aria-label={$t("pages.admin.reviews.projects.table.headers.status")}
                    onchange={(e) =>
                        onStatusChange?.(project.id, e.currentTarget.value as ProjectStatus)}
                >
                    {#each CAMPAIGN_REVIEW_STATUSES as status (status)}
                        <option value={status}>{statusLabel(status)}</option>
                    {/each}
                </select>
            </div>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 text-content border-t border-b p-4">
            {$t("pages.admin.reviews.projects.table.rows.unassigned")}
        </TableBodyCell>
        <TableBodyCell
            class="border-variant1 text-content rounded-r-md border-t border-r border-b p-4"
        >
            <Chevron
                direction={openRow === i ? "up" : "down"}
                width="20"
                height="20"
                class="mx-auto"
            />
        </TableBodyCell>
    {/snippet}
    {#snippet details(project: ReviewProjectRow)}
        <DetailsRow fields={detailFields(project)} columns={4}>
            {#snippet actions()}
                <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">
                    <Button kind="ghost" size="sm" href={`/${$locale}/project/${project.slug}`}>
                        {btnLabel("preview")}
                    </Button>
                    <Button
                        kind="ghost"
                        size="sm"
                        href={`/${$locale}/user/${project.promoterHandle}`}
                    >
                        {btnLabel("promoter")}
                    </Button>
                    <Button
                        kind="ghost"
                        size="sm"
                        href={`/${$locale}/project/${project.slug}/edit`}
                    >
                        {btnLabel("config")}
                    </Button>
                    <!-- ponytail: advisory/advisor endpoints don't exist yet -->
                    <Button kind="ghost" size="sm" disabled>{btnLabel("advisory")}</Button>
                    <Button kind="ghost" size="sm" disabled>{btnLabel("assignAdvisor")}</Button>
                </div>
            {/snippet}
            {#snippet footer()}
                <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <p class="text-content">
                        <span class="text-sm">
                            {$t("pages.admin.reviews.projects.table.rows.details.lastModified")}
                        </span>
                        <span class="font-bold">{date(project.dateUpdated)}</span>
                    </p>
                    {#if project.reviewId}
                        <Button
                            kind="secondary"
                            size="sm"
                            href={`/${$locale}/reviews/${project.reviewId}`}
                        >
                            <Comments size={20} class="shrink-0" />
                            {btnLabel("annotations")}
                        </Button>
                    {:else}
                        <!-- A project only opens its review once the API has launched it. -->
                        <Button kind="secondary" size="sm" disabled>
                            <Comments size={20} class="shrink-0" />
                            {btnLabel("annotations")}
                        </Button>
                    {/if}
                </div>
            {/snippet}
        </DetailsRow>
    {/snippet}
</DataTable>
