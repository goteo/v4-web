<script lang="ts" module>
    import type { ProjectStatus } from "../../../utils/projectStatus";
    import type { DataTableHeader, SortOption } from "../../library/tables/DataTable.svelte";

    export type ProjectRow = {
        id: number;
        name: string;
        slug: string;
        promoter: string;
        promoterHandle: string;
        achieved: string;
        paid: string;
        paidMatchfunding: string;
        status: ProjectStatus;
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
        // Hidden until the API provides the paid amount (also the cell below).
        // { key: "pages.admin.projects.table.headers.paid" },
        { key: "pages.admin.projects.table.headers.process" },
        { key: "", class: "w-12" },
    ];
</script>

<script lang="ts">
    import { TableBodyCell } from "flowbite-svelte";

    import ProjectsDetailsRow from "./ProjectsDetailsRow.svelte";
    import { t } from "../../../i18n/store";
    import { ADMIN_ITEMS_PER_PAGE_OPTIONS } from "../../../utils/adminTable";
    import { projectStatusLabelKey } from "../../../utils/projectStatus";
    import Chevron from "../../icons/navigation/Chevron.svelte";
    import DataTable from "../../library/tables/DataTable.svelte";
    import Tag from "../../library/tags/Tag.svelte";

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
        onStatusChange: (projectId: number, status: ProjectStatus) => Promise<boolean>;
        onOpenPaidModal?: (project: ProjectRow, e: MouseEvent) => void;
        onOpenAnnotationsModal?: (project: ProjectRow, e: MouseEvent) => void;
    } = $props();

    let openRow = $state<number | null>(null);

    function toggleRow(_row: ProjectRow, index: number): void {
        openRow = openRow === index ? null : index;
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
        <!-- Hidden until the API provides the paid amount: the column shows "—" and the modal saves nothing.
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
        -->
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            <Tag class="border-secondary max-w-56 rounded-md border">
                <span class="truncate">{$t(projectStatusLabelKey(project.status))}</span>
            </Tag>
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
            {onStatusChange}
            userEmail={userEmailById.get(project.id)}
        />
    {/snippet}
</DataTable>
