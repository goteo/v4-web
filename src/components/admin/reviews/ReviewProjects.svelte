<script lang="ts">
    import AssignAdvisorModal from "./AssignAdvisorModal.svelte";
    import ReviewProjectsTable, {
        type ProjectStatus,
        type ReviewProjectRow,
    } from "./ReviewProjectsTable.svelte";
    import { t } from "../../../i18n/store";
    import {
        apiProjectReviewsGetCollection,
        apiProjectReviewsIdPatch,
        apiProjectsGetCollection,
        apiProjectsGetCollectionUrl,
        apiProjectsIdOrSlugGetUrl,
        apiProjectsIdPatch,
        apiProjectSupportsmoneyTotalGetCollection,
        apiUsersIdOrHandleGet,
        type Project,
        type ProjectReview,
        type User,
    } from "../../../openapi/client/index.ts";
    import { useAdminTableState } from "../../../utils/adminTableState.svelte";
    import { formatCurrency } from "../../../utils/currencies";
    import { extractId } from "../../../utils/extractId";
    import { getCollectionTotalItems, toCollectionItems } from "../../../utils/hydra";
    import { CAMPAIGN_REVIEW_STATUSES } from "../../../utils/projectStatus";
    import Dashboard from "../AdminDashboard.svelte";
    import { projectSortMap, type ProjectSortKey } from "../projects/ProjectsTable.svelte";

    import type { ApiProjectsGetCollectionData } from "../../../openapi/client/types.gen";

    type ProjectsQuery = Partial<ApiProjectsGetCollectionData["query"]>;

    const table = useAdminTableState<ProjectSortKey>("date-desc", "review-projects-items-per-page");

    let filters: ProjectsQuery = $state({});
    let rows = $state<ReviewProjectRow[]>([]);
    let totalEarned = $state("—");

    let baseQuery = $derived<ProjectsQuery>({ "status[]": CAMPAIGN_REVIEW_STATUSES, ...filters });

    let slides = $derived([
        { title: $t("pages.admin.reviews.projects.totalizers.selected"), amount: table.totalItems },
        { title: $t("pages.admin.projects.totalizers.totalEarned"), amount: totalEarned },
    ]);

    async function fetchTotalEarned(ids: number[]) {
        const { data } = await apiProjectSupportsmoneyTotalGetCollection({
            baseUrl: "/api/relay",
            query: {
                "project[]": ids.map((id) =>
                    apiProjectsIdOrSlugGetUrl.replace("{idOrSlug}", String(id)),
                ),
            },
        });
        if (data) totalEarned = formatCurrency(data.amount, data.currency);
    }

    async function fetchOwner(iri: string): Promise<User | undefined> {
        const idOrHandle = extractId(iri);
        if (!idOrHandle) return undefined;
        const { data } = await apiUsersIdOrHandleGet({
            baseUrl: "/api/relay",
            path: { idOrHandle },
        });
        return data;
    }

    function toRow(
        project: Project,
        owner?: User,
        review?: { id: number; reviewer?: string },
        advisorName?: string,
    ): ReviewProjectRow {
        const min = project.budget?.minimum?.money;
        const opt = project.budget?.optimum?.money;

        return {
            id: project.id ?? 0,
            name: project.title,
            slug: project.slug ?? String(project.id),
            promoter: owner?.displayName ?? owner?.email ?? "—",
            promoterHandle: owner?.handle ?? "",
            email: owner?.email ?? "",
            status: project.status ?? "to_campaign_review",
            dateCreated: project.dateCreated ?? "",
            dateUpdated: project.dateUpdated ?? "",
            dateRelease: project.calendar?.release ?? "",
            minOptim:
                min && opt
                    ? `${formatCurrency(min.amount, min.currency)} - ${formatCurrency(opt.amount, opt.currency)}`
                    : "—",
            reviewId: review?.id,
            reviewer: review?.reviewer,
            advisor: advisorName,
        };
    }

    /**
     * Maps each project to the campaign review the API launched for it, so the table
     * can link to the conversation of every project that has one.
     */
    type ReviewRef = { id: number; reviewer?: string };

    async function fetchReviewsByProject(projectIds: number[]): Promise<Map<number, ReviewRef>> {
        const mapping = new Map<number, ReviewRef>();

        if (!projectIds.length) return mapping;

        const { data } = await apiProjectReviewsGetCollection({
            baseUrl: "/api/relay",
            query: {
                "project[]": projectIds.map((id) =>
                    apiProjectsIdOrSlugGetUrl.replace("{idOrSlug}", String(id)),
                ),
                itemsPerPage: 100,
            },
            headers: { Accept: "application/ld+json" },
        });

        for (const review of toCollectionItems<ProjectReview>(data)) {
            const projectId = extractId(review.project);

            if (projectId && review.id !== undefined) {
                mapping.set(Number(projectId), { id: review.id, reviewer: review.reviewer });
            }
        }

        return mapping;
    }

    async function loadProjects(): Promise<void> {
        table.isLoading = true;
        try {
            const sort = projectSortMap[table.selectedSort];
            const { data, error } = await apiProjectsGetCollection({
                baseUrl: "/api/relay",
                query: {
                    ...baseQuery,
                    page: table.currentPage,
                    itemsPerPage: table.itemsPerPage,
                    [`order[${sort.field}]`]: sort.direction,
                },
                headers: { Accept: "application/ld+json", "Accept-Language": " " },
            });
            if (error) {
                console.error("Failed to fetch review projects:", error);
                return;
            }

            const projects = toCollectionItems<Project>(data);
            table.totalItems = getCollectionTotalItems(data);
            fetchTotalEarned(projects.map((p) => p.id).filter(Boolean) as number[]);

            const ownerIris = [
                ...new Set(projects.map((p) => p.owner).filter(Boolean)),
            ] as string[];
            const owners = new Map(
                await Promise.all(
                    ownerIris.map(async (iri) => [iri, await fetchOwner(iri)] as const),
                ),
            );

            const projectIds = projects
                .map((p) => p.id)
                .filter((id): id is number => id !== undefined);
            const reviewsByProject = await fetchReviewsByProject(projectIds);

            const reviewerIris = [
                ...new Set(
                    [...reviewsByProject.values()]
                        .map((ref) => ref.reviewer)
                        .filter((iri): iri is string => Boolean(iri)),
                ),
            ];
            const advisors = new Map(
                await Promise.all(
                    reviewerIris.map(async (iri) => [iri, await fetchOwner(iri)] as const),
                ),
            );

            rows = projects.map((p) => {
                const review = reviewsByProject.get(p.id ?? 0);
                const reviewerIri = review?.reviewer;
                const advisor = reviewerIri ? advisors.get(reviewerIri) : undefined;

                return toRow(
                    p,
                    p.owner ? owners.get(p.owner) : undefined,
                    review,
                    advisor ? advisor.displayName || advisor.email : undefined,
                );
            });
        } finally {
            table.isLoading = false;
        }
    }

    $effect(() => {
        loadProjects();
    });

    async function handleStatusChange(projectId: number, status: ProjectStatus): Promise<void> {
        const { error } = await apiProjectsIdPatch({
            baseUrl: "/api/relay",
            path: { id: String(projectId) },
            body: { status },
        });
        if (error) console.error("Failed to update project status:", error);
        loadProjects();
    }

    let assignState = $state<{ reviewId: number; reviewer?: string; advisor?: string } | null>(null);
    let assignModalOpen = $state(false);

    function handleAssignAdvisor(project: ReviewProjectRow): void {
        if (!project.reviewId) return;

        assignState = {
            reviewId: project.reviewId,
            reviewer: project.reviewer,
            advisor: project.advisor,
        };
        assignModalOpen = true;
    }

    async function handleAssignReviewer(iri: string): Promise<void> {
        const state = assignState;
        assignModalOpen = false;
        assignState = null;

        if (!state) return;

        const { error } = await apiProjectReviewsIdPatch({
            baseUrl: "/api/relay",
            path: { id: String(state.reviewId) },
            body: { reviewer: iri },
        });
        if (error) console.error("Failed to assign advisor:", error);
        loadProjects();
    }

    function applyFilters(newFilters: ProjectsQuery): void {
        filters = { ...filters, ...newFilters };
        table.currentPage = 1;
    }
</script>

<Dashboard
    title={$t("pages.admin.reviews.projects.title")}
    description={$t("pages.admin.reviews.projects.description")}
    filters={{
        resource: "projects",
        filters,
        onApplyFilters: applyFilters,
        searchPlaceholder: $t("pages.admin.projects.filters.search.placeholder"),
        onSelectProject: (p: Project) => applyFilters({ title: p.title }),
    }}
    filterTags={{
        title: $t("pages.admin.reviews.projects.list"),
        filters,
        onCloseFilter: (newFilters: ProjectsQuery) => {
            filters = { ...newFilters };
            table.currentPage = 1;
        },
        resource: "projects",
    }}
    csv={{
        endpoint: apiProjectsGetCollectionUrl,
        filenamePrefix: "review-projects",
        queryParams: baseQuery,
        totalItems: table.totalItems,
    }}
    slider={{ slides, isLoading: table.isLoading }}
>
    <ReviewProjectsTable
        projects={rows}
        currentPage={table.currentPage}
        itemsPerPage={table.itemsPerPage}
        selectedSort={table.selectedSort}
        totalItems={table.totalItems}
        isLoading={table.isLoading}
        onPageChange={table.handlePageChange}
        onItemsPerPageChange={table.handleItemsPerPageChange}
        onSortChange={table.handleSortChange}
        onStatusChange={handleStatusChange}
        onAssignAdvisor={handleAssignAdvisor}
    />
    {#if assignState}
        <AssignAdvisorModal
            bind:open={assignModalOpen}
            title={$t("pages.admin.reviews.projects.table.rows.details.btns.assignAdvisor")}
            currentReviewer={assignState.reviewer}
            currentReviewerName={assignState.advisor}
            onAssign={handleAssignReviewer}
        />
    {/if}
</Dashboard>
