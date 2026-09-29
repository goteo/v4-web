<script lang="ts" module>
    import type { DataTableHeader, SortOption } from "../../library/tables/DataTable.svelte";

    export type ProjectRow = {
        id: number;
        name: string;
        slug: string;
        promoter: string;
        achieved: string;
        paid: string;
        paidMatchfunding: string;
        status: string;
        datePublished: string;
        dateEnd1: string;
        dateEnd2: string;
        minOptim: string;
        remaining: string;
        annotationsCount: number;
        annotations: string;
        accounting: string;
        owner: string;
    };

    export type ProjectSortKey = "date-asc" | "date-desc";

    export const PROJECT_ITEMS_PER_PAGE_LABEL = "pages.admin.projects.filters.itemsPerPage.title";

    export const projectSortMap: Record<
        ProjectSortKey,
        { field: "dateCreated" | "dateUpdated"; direction: "asc" | "desc" }
    > = {
        "date-desc": { field: "dateCreated", direction: "desc" },
        "date-asc": { field: "dateCreated", direction: "asc" },
    };

    export const projectSortOptions: SortOption[] = (
        Object.keys(projectSortMap) as ProjectSortKey[]
    ).map((key) => ({
        key,
        field: projectSortMap[key].field,
        direction: projectSortMap[key].direction,
        label: `pages.admin.projects.filters.order.options.${key}`,
    }));

    export const projectTableHeaders: DataTableHeader[] = [
        { key: "pages.admin.projects.table.headers.name" },
        { key: "pages.admin.projects.table.headers.promoter" },
        { key: "pages.admin.projects.table.headers.achieved" },
        { key: "pages.admin.projects.table.headers.paid" },
        { key: "pages.admin.projects.table.headers.process" },
        { key: "", class: "w-12" },
    ];
</script>

<script lang="ts">
    import { TableBodyCell } from "flowbite-svelte";

    import ProjectsDetailsRow from "./ProjectsDetailsRow.svelte";
    import { t } from "../../../i18n/store";
    import { ADMIN_ITEMS_PER_PAGE_OPTIONS } from "../../../utils/adminTable";
    import Chevron from "../../icons/navigation/Chevron.svelte";
    import DataTable from "../../library/tables/DataTable.svelte";

    let {
        projects = [],
        currentPage = 1,
        totalItems = 0,
        itemsPerPage = ADMIN_ITEMS_PER_PAGE_OPTIONS[0],
        isLoading = false,
        selectedSort = $bindable<ProjectSortKey>("date-desc"),
        userEmailById = new Map<number, string>(),
        onPageChange,
        onItemsPerPageChange,
        onSortChange,
        onStatusChange,
        onOpenPaidModal,
        onOpenAnnotationsModal,
        onChangeStatus,
    }: {
        projects: ProjectRow[];
        currentPage: number;
        totalItems: number;
        itemsPerPage: number;
        isLoading: boolean;
        selectedSort: ProjectSortKey;
        userEmailById?: Map<number, string>;
        onPageChange?: (page: number) => void;
        onItemsPerPageChange?: (perPage: number) => void;
        onSortChange?: (sort: ProjectSortKey) => void;
        onStatusChange?: (projectId: number, status: string) => void;
        onOpenPaidModal?: (project: ProjectRow, e: MouseEvent) => void;
        onOpenAnnotationsModal?: (project: ProjectRow, e: MouseEvent) => void;
        onChangeStatus?: (projectId: number) => void;
    } = $props();

    let openRow = $state<number | null>(null);

    const statusOptions = [
        { value: "in_draft", label: $t("domain.project.status.in_draft") },
        {
            value: "to_campaign_review",
            label: $t("domain.project.status.to_campaign_review"),
        },
        {
            value: "in_campaign_review",
            label: $t("domain.project.status.in_campaign_review"),
        },
        {
            value: "in_campaign_review.to_change",
            label: $t("domain.project.status.in_campaign_review_to_change"),
        },
        {
            value: "in_campaign_review.to_review",
            label: $t("domain.project.status.in_campaign_review_to_review"),
        },
        {
            value: "campaign_review_rejected",
            label: $t("domain.project.status.campaign_review_rejected"),
        },
        { value: "to_campaign", label: $t("domain.project.status.to_campaign") },
        { value: "in_campaign", label: $t("domain.project.status.in_campaign") },
        {
            value: "campaign_failed",
            label: $t("domain.project.status.campaign_failed"),
        },
        {
            value: "campaign_cancelled",
            label: $t("domain.project.status.campaign_cancelled"),
        },
        {
            value: "to_funding_review",
            label: $t("domain.project.status.to_funding_review"),
        },
        {
            value: "in_funding_review",
            label: $t("domain.project.status.in_funding_review"),
        },
        {
            value: "in_funding_review.to_change",
            label: $t("domain.project.status.in_funding_review_to_change"),
        },
        {
            value: "in_funding_review.to_review",
            label: $t("domain.project.status.in_funding_review_to_review"),
        },
        {
            value: "funding_review_rejected",
            label: $t("domain.project.status.funding_review_rejected"),
        },
        { value: "to_funding", label: $t("domain.project.status.to_funding") },
        { value: "in_funding", label: $t("domain.project.status.in_funding") },
        { value: "funding_paid", label: $t("domain.project.status.funding_paid") },
    ];

    function toggleRow(_row: ProjectRow, index: number): void {
        openRow = openRow === index ? null : index;
    }

    function handleStatusChangeInline(project: ProjectRow, newStatus: string) {
        onStatusChange?.(project.id, newStatus);
    }
</script>

<DataTable
    headers={projectTableHeaders}
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
    onHeaderSort={(k) => onSortChange?.(k as ProjectSortKey)}
    onRowClick={toggleRow}
    bind:expandedRowIndex={openRow}
>
    {#snippet children(project, i)}
        <TableBodyCell class="border-variant1 max-w-60 rounded-l-md border-t border-b border-l p-4">
            <p class="truncate font-medium text-black">{project.name}</p>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4 text-sm">
            <span class="block truncate">{project.promoter}</span>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            {project.achieved}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            <div class="flex items-center gap-2">
                <span>{project.paid}</span>
                <button
                    onclick={(e) => onOpenPaidModal?.(project, e)}
                    class="text-secondary hover:text-secondary/70 cursor-pointer"
                    aria-label={$t("pages.admin.projects.table.headers.paid")}
                >
                    <span class="text-xs underline">✎</span>
                </button>
            </div>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            <div onclick={(e) => e.stopPropagation()} role="presentation">
                <select
                    class="border-secondary text-secondary rounded-sm border py-1 text-sm"
                    value={project.status}
                    onchange={(e) => handleStatusChangeInline(project, e.currentTarget.value)}
                >
                    {#each statusOptions as opt}
                        <option value={opt.value}>{opt.label}</option>
                    {/each}
                </select>
            </div>
        </TableBodyCell>
        <TableBodyCell
            class="border-variant1 text-content rounded-r-md border-t border-r border-b p-4 text-sm"
        >
            <Chevron
                direction={openRow === i ? "up" : "down"}
                width="20"
                height="20"
                class="mx-auto"
            />
        </TableBodyCell>
    {/snippet}
    {#snippet details(project)}
        <ProjectsDetailsRow
            {project}
            onOpenAnnotationsModal={() =>
                onOpenAnnotationsModal?.(project, new MouseEvent("click"))}
            {onChangeStatus}
            userEmail={userEmailById.get(project.id)}
        />
    {/snippet}
</DataTable>
