<script lang="ts" module>
    import type { ProjectReview } from "../../../openapi/client/index.ts";
    import type { ProjectReviewRisk } from "../../../types/projectReview";
    import type { ProjectStatus } from "../../../utils/projectStatus";
    import type { DataTableHeader } from "../../library/tables/DataTable.svelte";

    export type ReviewProjectRow = {
        id: number;
        name: string;
        slug: string;
        promoter: string;
        promoterHandle: string;
        email: string;
        /** Unknown until the project behind the review has been resolved. */
        status?: ProjectStatus;
        dateCreated: string;
        dateUpdated: string;
        dateRelease: string;
        minOptim: string;
        /** Identifier of the campaign review this project has, when the API has launched it. */
        reviewId?: number;
        /** Kind of review the project is going through; decides the selectable statuses. */
        reviewType?: ProjectReview["type"];
        /** Iri of the reviewer assigned to the campaign review, when there is one. */
        reviewer?: string;
        /** Display name of the assigned reviewer, shown in the advisor column. */
        advisor?: string;
        /** Last activity of the campaign review, taken from the review rather than the project. */
        lastInteraction: string;
        /** Risks of the review's areas, if the areas have been hydrated. */
        risks?: ProjectReviewRisk[];
    };

    const headers: DataTableHeader[] = [
        { key: "pages.admin.reviews.projects.table.headers.id", class: "w-16" },
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
    import { SvelteSet } from "svelte/reactivity";

    import { t, locale } from "../../../i18n/store";
    import { ADMIN_ITEMS_PER_PAGE_OPTIONS } from "../../../utils/adminTable";
    import { formatDate } from "../../../utils/dates";
    import { REVIEW_STATUSES_BY_TYPE, projectStatusLabelKey } from "../../../utils/projectStatus";
    import { RISK_SQUARE_CLASSES } from "../../../utils/review";
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

    import type { Snippet } from "svelte";

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
        onStatusChange?: (projectId: number, status: ProjectStatus) => Promise<void>;
        onAssignAdvisor?: (project: ReviewProjectRow) => void;
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
        onAssignAdvisor,
    }: Props = $props();

    let openRow = $state<number | null>(null);

    const updatingStatus = new SvelteSet<number>();

    async function handleStatusChange(projectId: number, status: ProjectStatus) {
        updatingStatus.add(projectId);
        try {
            await onStatusChange?.(projectId, status);
        } finally {
            updatingStatus.delete(projectId);
        }
    }

    /**
     * Statuses a project can move to for the kind of review it is going through.
     * Whatever status the project holds is always offered, so a review that
     * predates the current flow still displays its real state.
     */
    function statusOptions(project: ReviewProjectRow): ProjectStatus[] {
        const base = REVIEW_STATUSES_BY_TYPE[project.reviewType ?? "campaign"];
        return project.status && !base.includes(project.status) ? [project.status, ...base] : base;
    }

    const date = (value: string) => (value ? formatDate(new Date(value), $locale) : "—");

    function detailFields(project: ReviewProjectRow, riskSquares: Snippet): DetailsField[] {
        const label = (key: string) => $t(`pages.admin.reviews.projects.table.rows.details.${key}`);
        // ponytail: risk and phone have no API yet — placeholders
        const risks = project.risks ?? [];
        return [
            { label: label("email"), value: project.email || "—" },
            { label: label("phone"), value: "—" },
            { label: label("dateRelease"), value: date(project.dateRelease) },
            { label: label("dateCreated"), value: date(project.dateCreated) },
            { label: label("lastInteraction"), value: date(project.lastInteraction) },
            risks.length
                ? { label: label("risk"), snippet: riskSquares }
                : { label: label("risk"), value: "—" },
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
        <TableBodyCell
            class="border-variant1 text-content w-16 rounded-l-md border-t border-b border-l p-4"
        >
            <span class="block">{project.id}</span>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 max-w-60 border-t border-b p-4">
            <p class="text-content truncate">{project.name || "—"}</p>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 text-content border-t border-b p-4">
            <span class="block truncate">{project.promoter || "—"}</span>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 text-content border-t border-b p-4">
            {date(project.dateUpdated)}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            <div onclick={(e) => e.stopPropagation()} role="presentation">
                <select
                    class="border-secondary text-secondary bg-purple-soft w-full rounded-sm border py-1 text-sm disabled:opacity-50"
                    value={project.status ?? ""}
                    disabled={!project.status || updatingStatus.has(project.id)}
                    aria-label={$t("pages.admin.reviews.projects.table.headers.status")}
                    onchange={(e) =>
                        handleStatusChange(project.id, e.currentTarget.value as ProjectStatus)}
                >
                    {#if !project.status}
                        <option value="">—</option>
                    {/if}
                    {#each statusOptions(project) as status (status)}
                        <option value={status}>{$t(projectStatusLabelKey(status))}</option>
                    {/each}
                </select>
            </div>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 text-content border-t border-b p-4">
            {project.advisor || $t("pages.admin.reviews.projects.table.rows.unassigned")}
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
        {#snippet riskSquares()}
            <div class="flex flex-wrap items-center gap-1">
                {#each project.risks ?? [] as risk, index (index)}
                    <span
                        class="size-3 rounded-sm {RISK_SQUARE_CLASSES[risk]}"
                        title={$t(`domain.review.risks.${risk}`)}
                        aria-label={$t(`domain.review.risks.${risk}`)}
                    ></span>
                {/each}
            </div>
        {/snippet}
        <DetailsRow fields={detailFields(project, riskSquares)} columns={4}>
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
                    {#if project.reviewId}
                        <Button
                            kind="ghost"
                            size="sm"
                            href={`/${$locale}/reviews/${project.reviewId}`}
                        >
                            {btnLabel("advisory")}
                        </Button>
                    {:else}
                        <Button kind="ghost" size="sm" disabled>{btnLabel("advisory")}</Button>
                    {/if}
                    {#if project.reviewId}
                        <Button kind="ghost" size="sm" onclick={() => onAssignAdvisor?.(project)}>
                            {btnLabel("assignAdvisor")}
                        </Button>
                    {:else}
                        <Button kind="ghost" size="sm" disabled>
                            {btnLabel("assignAdvisor")}
                        </Button>
                    {/if}
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
