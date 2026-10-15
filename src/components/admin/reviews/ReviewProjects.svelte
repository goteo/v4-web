<script lang="ts">
    import AssignAdvisorModal from "./AssignAdvisorModal.svelte";
    import ReviewProjectsTable, {
        type ProjectStatus,
        type ReviewProjectRow,
    } from "./ReviewProjectsTable.svelte";
    import { t } from "../../../i18n/store";
    import {
        apiProjectReviewsGetCollection,
        apiProjectReviewsGetCollectionUrl,
        apiProjectReviewsIdPatch,
        apiProjectsIdPatch,
        apiProjectsIdOrSlugGetUrl,
        apiProjectSupportsmoneyTotalGetCollection,
        apiUsersIdOrHandleGetUrl,
        type Project,
        type ProjectReview,
        type User,
    } from "../../../openapi/client/index.ts";
    import { useAdminTableState } from "../../../utils/adminTableState.svelte";
    import { formatCurrency } from "../../../utils/currencies";
    import { invalidateProject, resolveProject, resolveUser } from "../../../utils/entityResolvers";
    import { extractId } from "../../../utils/extractId";
    import { getCollectionTotalItems, toCollectionItems } from "../../../utils/hydra";
    import Dashboard from "../AdminDashboard.svelte";
    import { projectSortMap, type ProjectSortKey } from "../projects/ProjectsTable.svelte";

    import type { ApiProjectReviewsGetCollectionData } from "../../../openapi/client/types.gen";

    type ReviewsQuery = Partial<ApiProjectReviewsGetCollectionData["query"]>;

    /** Every project undergoing a review — of either kind — shows up in the table. */
    const REVIEW_TYPES = ["campaign", "financial"];

    const table = useAdminTableState<ProjectSortKey>("date-desc", "review-projects-items-per-page");

    let filters: ReviewsQuery = $state({});
    let totalEarned = $state("—");

    let baseQuery = $derived<ReviewsQuery>({ "type[]": REVIEW_TYPES, ...filters });

    /** Raw reviews, the primary list the table is built from. */
    let reviews = $state<ProjectReview[]>([]);
    /** Projects and people each review points at, filled in as they resolve. */
    let projectsByIri = $state(new Map<string, Project>());
    let usersByIri = $state(new Map<string, User>());

    /** Rows recompute on their own as the resolved projects and users arrive. */
    let rows = $derived(reviews.map(toRow));

    let slides = $derived([
        { title: $t("pages.admin.reviews.projects.totalizers.selected"), amount: table.totalItems },
        { title: $t("pages.admin.projects.totalizers.totalEarned"), amount: totalEarned },
    ]);

    function toRow(review: ProjectReview): ReviewProjectRow {
        const projectIri = review.project ?? "";
        const project = projectIri ? projectsByIri.get(projectIri) : undefined;
        const owner = project?.owner ? usersByIri.get(project.owner) : undefined;
        const reviewer = review.reviewer ? usersByIri.get(review.reviewer) : undefined;

        const projectId = Number(extractId(projectIri));
        const min = project?.budget?.minimum?.money;
        const opt = project?.budget?.optimum?.money;

        return {
            id: project?.id ?? (Number.isFinite(projectId) ? projectId : 0),
            name: project?.title ?? "",
            slug: project?.slug ?? "",
            promoter: owner?.displayName ?? owner?.email ?? "",
            promoterHandle: owner?.handle ?? "",
            email: owner?.email ?? "",
            status: project?.status,
            dateCreated: project?.dateCreated ?? "",
            dateUpdated: project?.dateUpdated ?? "",
            dateRelease: project?.calendar?.release ?? "",
            minOptim:
                min && opt
                    ? `${formatCurrency(min.amount, min.currency)} - ${formatCurrency(opt.amount, opt.currency)}`
                    : "—",
            reviewId: review.id,
            reviewType: review.type,
            reviewer: review.reviewer,
            advisor: reviewer ? reviewer.displayName || reviewer.email : undefined,
            // The review is what moves in a review, so its own activity is what the
            // detail row reports as the last interaction.
            lastInteraction: review.dateUpdated ?? "",
        };
    }

    async function fetchTotalEarned(projectIris: string[]) {
        if (!projectIris.length) return;

        const { data } = await apiProjectSupportsmoneyTotalGetCollection({
            baseUrl: "/api/relay",
            query: { "project[]": projectIris },
        });
        if (data) totalEarned = formatCurrency(data.amount, data.currency);
    }

    /**
     * Loads the campaign and funding reviews pending of resolution and shows the
     * table right away. The data each row needs beyond the review itself (project,
     * owner, assigned reviewer) is fetched afterwards so a slow entity never holds
     * back the whole page.
     */
    async function loadReviews(): Promise<void> {
        table.isLoading = true;
        try {
            const sort = projectSortMap[table.selectedSort];
            const { data, error } = await apiProjectReviewsGetCollection({
                baseUrl: "/api/relay",
                query: {
                    ...baseQuery,
                    page: table.currentPage,
                    itemsPerPage: table.itemsPerPage,
                    [`order[${sort.field}]`]: sort.direction,
                },
                headers: { Accept: "application/ld+json" },
            });

            if (error) {
                console.error("Failed to fetch project reviews:", error);
                return;
            }

            reviews = toCollectionItems<ProjectReview>(data);
            table.totalItems = getCollectionTotalItems(data);

            hydrate(reviews);
            fetchTotalEarned(unique(reviews.map((review) => review.project)));
        } finally {
            table.isLoading = false;
        }
    }

    /**
     * Resolves in the background the project and people behind each review. The
     * caches in `entityResolvers` make sure repeated IRIs across rows only hit the
     * API once.
     */
    function hydrate(reviewsToHydrate: ProjectReview[]): void {
        for (const iri of unique(reviewsToHydrate.map((review) => review.project))) {
            resolveProject(iri).then((project) => {
                if (!project) return;

                projectsByIri.set(iri, project);
                if (project.owner) hydrateUser(project.owner);
            });
        }

        for (const iri of unique(reviewsToHydrate.map((review) => review.reviewer))) {
            hydrateUser(iri);
        }
    }

    function hydrateUser(iri: string): void {
        resolveUser(iri).then((user) => {
            if (user) usersByIri.set(iri, user);
        });
    }

    function unique(values: (string | undefined)[]): string[] {
        return [...new Set(values.filter((iri): iri is string => Boolean(iri)))];
    }

    $effect(() => {
        loadReviews();
    });

    async function handleStatusChange(projectId: number, status: ProjectStatus): Promise<void> {
        const { error } = await apiProjectsIdPatch({
            baseUrl: "/api/relay",
            path: { id: String(projectId) },
            body: { status },
        });
        if (error) console.error("Failed to update project status:", error);

        invalidateProject(apiProjectsIdOrSlugGetUrl.replace("{idOrSlug}", String(projectId)));
        loadReviews();
    }

    let assignState = $state<{ reviewId: number; reviewer?: string; advisor?: string } | null>(
        null,
    );
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
        loadReviews();
    }

    function applyFilters(newFilters: ReviewsQuery): void {
        filters = { ...filters, ...newFilters };
        table.currentPage = 1;
    }

    function projectFilter(project: { ["@id"]?: string; id?: number }): ReviewsQuery {
        const iri =
            project["@id"] ?? apiProjectsIdOrSlugGetUrl.replace("{idOrSlug}", String(project.id));
        return { "project[]": [iri] };
    }

    function reviewerFilter(user: { ["@id"]?: string; id?: number }): ReviewsQuery {
        const iri =
            user["@id"] ?? apiUsersIdOrHandleGetUrl.replace("{idOrHandle}", String(user.id));
        return { "reviewer[]": [iri] };
    }
</script>

<Dashboard
    title={$t("pages.admin.reviews.projects.title")}
    description={$t("pages.admin.reviews.projects.description")}
    filters={{
        resource: "project_reviews",
        filters,
        onApplyFilters: applyFilters,
        searchPlaceholder: $t("pages.admin.projects.filters.search.placeholder"),
        onSelectProject: (p) => applyFilters(projectFilter(p)),
        onSelectUser: (u) => applyFilters(reviewerFilter(u)),
    }}
    filterTags={{
        title: $t("pages.admin.reviews.projects.list"),
        filters,
        onCloseFilter: (newFilters: ReviewsQuery) => {
            filters = { ...newFilters };
            table.currentPage = 1;
        },
        resource: "project_reviews",
    }}
    csv={{
        endpoint: apiProjectReviewsGetCollectionUrl,
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
