<script lang="ts">
    import { SvelteMap } from "svelte/reactivity";

    import AssignAdvisorModal from "./AssignAdvisorModal.svelte";
    import ReviewDecisionModal from "./ReviewDecisionModal.svelte";
    import ReviewProjectsTable, {
        type ProjectStatus,
        type ReviewProjectRow,
    } from "./ReviewProjectsTable.svelte";
    import { t } from "../../../i18n/store";
    import {
        apiProjectReviewAreasGetCollection,
        apiProjectReviewsGetCollection,
        apiProjectReviewsGetCollectionUrl,
        apiProjectReviewsIdPatch,
        apiProjectsGetCollection,
        apiProjectsGetCollectionUrl,
        apiProjectsIdPatch,
        apiProjectsIdOrSlugGetUrl,
        apiProjectSupportsmoneyTotalGetCollection,
        apiUsersIdOrHandleGetUrl,
        type Project,
        type ProjectReview,
        type ProjectReviewArea,
        type User,
    } from "../../../openapi/client/index.ts";
    import { useAdminTableState } from "../../../utils/adminTableState.svelte";
    import { formatCurrency } from "../../../utils/currencies";
    import { invalidateProject, resolveProject, resolveUser } from "../../../utils/entityResolvers";
    import { extractId } from "../../../utils/extractId";
    import { getCollectionTotalItems, toCollectionItems } from "../../../utils/hydra";
    import {
        CAMPAIGN_REVIEW_STATES,
        CAMPAIGN_REVIEW_STATE_LABELS,
        campaignReviewState,
        expandCampaignReviewStates,
        type CampaignReviewState,
    } from "../../../utils/review";
    import Toast from "../../library/feedback/Toast.svelte";
    import Dashboard from "../AdminDashboard.svelte";
    import { projectSortMap, type ProjectSortKey } from "../projects/ProjectsTable.svelte";

    import type { ApiProjectReviewsGetCollectionData } from "../../../openapi/client/types.gen";
    import type { ProjectReviewRisk } from "../../../types/projectReview";

    type ReviewsQuery = Partial<ApiProjectReviewsGetCollectionData["query"]>;

    /** Every project undergoing a review — of either kind — shows up in the table. */
    const REVIEW_TYPES = ["campaign", "financial"];

    /** Projects a public review state resolved to, and whether there were too many to send. */
    type StateProjectList = { iris: string[]; overflow: boolean; total: number };

    /**
     * Filter that picks one of the five public review states.
     *
     * The reviews endpoint cannot filter by the status of the reviewed project, so
     * the table reads this param, asks the Project collection which projects are in
     * those statuses and sends the result to the reviews endpoint as a list of
     * projects.
     */
    const STATE_FILTER_KEY = "projectStatus[]";
    /** Projects per page while resolving the state filter; 100 is what the API accepts. */
    const STATE_FILTER_PAGE_SIZE = 100;
    /**
     * How many projects the state filter may expand to. Their ids travel in the URL
     * of every reviews request, so a longer list would not fit in a request line.
     */
    const STATE_FILTER_MAX_PROJECTS = 150;

    const table = useAdminTableState<ProjectSortKey>("date-desc", "review-projects-items-per-page");

    let filters: ReviewsQuery = $state({});
    let totalEarned = $state("—");

    /** Projects the state filter resolved to; undefined when the table is unfiltered. */
    let stateProjectIris = $state<string[] | undefined>(undefined);
    /** The state filter matched more projects than a request line can carry. */
    let stateFilterOverflow = $state(false);
    /** Guards the overflow toast so paging and sorting do not repeat it. */
    let overflowToastShown = false;
    /**
     * Resolved state filters, so paging and sorting do not query the Project
     * collection again. A plain `Map` on purpose: a reactive cache would rearm the
     * loading effect.
     */
    const stateProjectsCache = new Map<string, StateProjectList>();

    /** Query for the reviews endpoint, without the state filter it does not understand. */
    let baseQuery = $derived<ReviewsQuery>({
        "type[]": REVIEW_TYPES,
        ...withoutStateFilter(filters),
    });

    /** Same query as the table, with the resolved projects, for the CSV export. */
    let csvQuery = $derived<ReviewsQuery>(
        stateProjectIris ? { ...baseQuery, "project[]": stateProjectIris } : baseQuery,
    );

    /** A state filter is still looking up its projects; the CSV cannot follow it yet. */
    let stateFilterPending = $derived(
        readStateFilter(filters).length > 0 &&
            stateProjectIris === undefined &&
            !stateFilterOverflow,
    );

    /** Raw reviews, the primary list the table is built from. */
    let reviews = $state<ProjectReview[]>([]);
    /** Projects and people each review points at, filled in as they resolve. */
    let projectsByIri = new SvelteMap<string, Project>();
    let usersByIri = new SvelteMap<string, User>();

    /** Risks of each review, by the review id. */
    let risksByReviewId = new SvelteMap<number, ProjectReviewRisk[]>();

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
            risks: review.id ? (risksByReviewId.get(review.id) ?? []) : [],
        };
    }

    async function fetchTotalEarned(projectIris: string[]) {
        if (!projectIris.length) {
            totalEarned = formatCurrency(0, import.meta.env.PUBLIC_DEFAULT_CURRENCY);
            return;
        }

        const { data } = await apiProjectSupportsmoneyTotalGetCollection({
            baseUrl: "/api/relay",
            query: { "project[]": projectIris },
        });
        if (data) totalEarned = formatCurrency(data.amount, data.currency);
    }

    /**
     * @param query Filters applied to the table
     * @returns The public states picked in the filter bar, ignoring anything else
     */
    function readStateFilter(query: ReviewsQuery): CampaignReviewState[] {
        const selected = (query as Record<string, unknown>)[STATE_FILTER_KEY];
        const values = Array.isArray(selected)
            ? selected
            : typeof selected === "string"
              ? selected.split(",")
              : [];

        return values.filter((value): value is CampaignReviewState =>
            CAMPAIGN_REVIEW_STATES.includes(value as CampaignReviewState),
        );
    }

    /**
     * @param query Filters applied to the table
     * @returns The same query without the state filter, which the reviews endpoint cannot read
     */
    function withoutStateFilter(query: ReviewsQuery): ReviewsQuery {
        const rest: Record<string, unknown> = { ...query };
        delete rest[STATE_FILTER_KEY];
        delete rest.projectStatus;

        return rest as ReviewsQuery;
    }

    /**
     * Resolves the public states into the projects they cover.
     *
     * A list too long to travel in a URL is refused instead of silently losing
     * rows: the table then explains that the filter needs to be narrowed.
     */
    async function resolveStateProjects(states: CampaignReviewState[]): Promise<StateProjectList> {
        const key = [...states].sort().join(",");
        const cached = stateProjectsCache.get(key);

        if (cached) return cached;

        const statuses = expandCampaignReviewStates(states);
        const iris: string[] = [];
        let page = 1;
        let total = Number.POSITIVE_INFINITY;

        while ((page - 1) * STATE_FILTER_PAGE_SIZE < total) {
            const { data, error } = await apiProjectsGetCollection({
                baseUrl: "/api/relay",
                query: {
                    "status[]": statuses,
                    page,
                    itemsPerPage: STATE_FILTER_PAGE_SIZE,
                },
                headers: { Accept: "application/ld+json" },
            });

            if (error || !data) {
                console.error("Failed to resolve the review state filter:", error);
                notify("error", $t("pages.admin.reviews.projects.filter.failed"));
                return { iris: [], overflow: false, total: 0 };
            }

            total = getCollectionTotalItems(data);

            if (total > STATE_FILTER_MAX_PROJECTS) {
                const overflow = { iris: [], overflow: true, total };
                stateProjectsCache.set(key, overflow);
                return overflow;
            }

            const projects = toCollectionItems<Project>(data);
            if (!projects.length) break;

            iris.push(...projects.map((project) => `${apiProjectsGetCollectionUrl}/${project.id}`));
            page++;
        }

        const resolved = { iris, overflow: false, total: iris.length };
        stateProjectsCache.set(key, resolved);
        return resolved;
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
            const states = readStateFilter(filters);
            let projectIris: string[] | undefined;

            if (states.length) {
                const resolved = await resolveStateProjects(states);

                stateFilterOverflow = resolved.overflow;

                if (resolved.overflow) {
                    reviews = [];
                    table.totalItems = 0;
                    stateProjectIris = undefined;

                    if (!overflowToastShown) {
                        notify(
                            "error",
                            $t("pages.admin.reviews.projects.filter.tooManyProjects", {
                                count: resolved.total,
                                max: STATE_FILTER_MAX_PROJECTS,
                            }),
                        );
                        overflowToastShown = true;
                    }

                    return;
                }

                overflowToastShown = false;
                projectIris = resolved.iris;
                stateProjectIris = projectIris;

                if (!projectIris.length) {
                    reviews = [];
                    table.totalItems = 0;
                    return;
                }
            } else {
                stateFilterOverflow = false;
                overflowToastShown = false;
                stateProjectIris = undefined;
            }

            const sort = projectSortMap[table.selectedSort];
            const { data, error } = await apiProjectReviewsGetCollection({
                baseUrl: "/api/relay",
                query: {
                    ...baseQuery,
                    ...(projectIris ? { "project[]": projectIris } : {}),
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
            hydrateRisks(reviews);
            await fetchTotalEarned(unique(reviews.map((review) => review.project)));
        } finally {
            table.isLoading = false;
        }
    }

    /**
     * Reads the areas of every review on screen and keeps their risks by review.
     *
     * The areas of all reviews are read in a single paginated request, so the row
     * of squares costs one round-trip no matter how many reviews the page holds.
     */
    async function hydrateRisks(reviewsToHydrate: ProjectReview[]): Promise<void> {
        if (!reviewsToHydrate.length) return;

        const reviewIris = unique(
            reviewsToHydrate.map((review) =>
                review.id ? `${apiProjectReviewsGetCollectionUrl}/${review.id}` : undefined,
            ),
        );

        if (!reviewIris.length) return;

        const byReview = new Map<number, ProjectReviewRisk[]>();
        const itemsPerPage = 100;
        let page = 1;
        let total = Number.POSITIVE_INFINITY;

        try {
            while ((page - 1) * itemsPerPage < total) {
                const { data, error } = await apiProjectReviewAreasGetCollection({
                    baseUrl: "/api/relay",
                    query: {
                        "review[]": reviewIris,
                        page,
                        itemsPerPage,
                        "order[dateCreated]": "asc",
                    },
                    headers: { Accept: "application/ld+json" },
                });

                if (error || !data) break;

                const areas = toCollectionItems<ProjectReviewArea>(data);
                total = getCollectionTotalItems(data);

                for (const area of areas) {
                    if (!area.risk) continue;
                    const reviewId = Number(extractId(area.review ?? ""));
                    if (!Number.isFinite(reviewId)) continue;
                    const risks = byReview.get(reviewId) ?? [];
                    risks.push(area.risk);
                    byReview.set(reviewId, risks);
                }

                if (!areas.length) break;
                page++;
            }
        } catch (error) {
            console.error("Failed to fetch review areas:", error);
            return;
        }

        for (const [reviewId, risks] of byReview) {
            risksByReviewId.set(reviewId, risks);
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

    let toastMessage = $state("");
    let toastVariant = $state<"success" | "error">("success");
    let showToast = $state(false);

    function notify(variant: "success" | "error", message: string): void {
        toastVariant = variant;
        toastMessage = message;
        showToast = true;
    }

    /** Decision waiting for the confirmation a select cannot ask for. */
    let pendingDecision = $state<{ project: ReviewProjectRow; status: ProjectStatus } | null>(null);
    let decisionModalOpen = $state(false);

    let decisionDescription = $derived.by(() => {
        const decision = pendingDecision;

        if (!decision) return "";

        const state = campaignReviewState(decision.status);

        return $t("pages.admin.reviews.projects.decisions.description", {
            project: decision.project.name || `#${decision.project.id}`,
            state: state ? $t(CAMPAIGN_REVIEW_STATE_LABELS[state]) : decision.status,
        });
    });

    function handleStatusChange(project: ReviewProjectRow, status: ProjectStatus): void {
        pendingDecision = { project, status };
        decisionModalOpen = true;
    }

    function cancelStatusChange(): void {
        decisionModalOpen = false;
        pendingDecision = null;
    }

    /**
     * Rejected and approved are the last stop of a review, and changes requested
     * sends the project back to its promoter, so none of them is applied straight
     * from the select: the table is only reloaded once the decision is confirmed.
     */
    async function confirmStatusChange(): Promise<void> {
        const decision = pendingDecision;

        cancelStatusChange();

        if (!decision) return;

        const projectId = decision.project.id;
        const name = decision.project.name || `#${projectId}`;

        const { error } = await apiProjectsIdPatch({
            baseUrl: "/api/relay",
            path: { id: String(projectId) },
            body: { status: decision.status },
        });

        if (error) {
            console.error("Failed to update project status:", error);
            notify(
                "error",
                $t("pages.admin.reviews.projects.toasts.statusNotUpdated", { project: name }),
            );
            return;
        }

        notify(
            "success",
            $t("pages.admin.reviews.projects.toasts.statusUpdated", { project: name }),
        );
        invalidateProject(apiProjectsIdOrSlugGetUrl.replace("{idOrSlug}", String(projectId)));
        stateProjectsCache.clear();
        loadReviews();
    }

    let assignState = $state<{
        reviewId: number;
        projectId: number;
        projectStatus?: ProjectStatus;
        projectName: string;
        reviewer?: string;
        advisor?: string;
    } | null>(null);
    let assignModalOpen = $state(false);

    function handleAssignAdvisor(project: ReviewProjectRow): void {
        if (!project.reviewId) return;

        assignState = {
            reviewId: project.reviewId,
            projectId: project.id,
            projectStatus: project.status,
            projectName: project.name || `#${project.id}`,
            reviewer: project.reviewer,
            advisor: project.advisor,
        };
        assignModalOpen = true;
    }

    /**
     * Assigning the first advisor opens the review.
     *
     * The API moves the project when it enters the review, not when a reviewer is
     * set, so without this the review would stay pending for everybody. A
     * reassignment must not touch the project, hence the status check.
     */
    async function handleAssignReviewer(iri: string, name: string): Promise<void> {
        const state = assignState;
        assignModalOpen = false;
        assignState = null;

        if (!state) return;

        let failed = false;

        const { error } = await apiProjectReviewsIdPatch({
            baseUrl: "/api/relay",
            path: { id: String(state.reviewId) },
            body: { reviewer: iri },
        });

        if (error) {
            console.error("Failed to assign advisor:", error);
            failed = true;
            notify(
                "error",
                $t("pages.admin.reviews.projects.toasts.advisorNotAssigned", {
                    project: state.projectName,
                }),
            );
        }

        if (!failed && state.projectStatus === "to_campaign_review") {
            const { error: statusError } = await apiProjectsIdPatch({
                baseUrl: "/api/relay",
                path: { id: String(state.projectId) },
                body: { status: "in_campaign_review" },
            });

            if (statusError) {
                console.error("Failed to open the review:", statusError);
                failed = true;
                notify(
                    "error",
                    $t("pages.admin.reviews.projects.toasts.statusNotUpdated", {
                        project: state.projectName,
                    }),
                );
            }
        }

        if (!failed) {
            notify(
                "success",
                $t("pages.admin.reviews.projects.toasts.advisorAssigned", {
                    advisor: name,
                    project: state.projectName,
                }),
            );
        }

        invalidateProject(apiProjectsIdOrSlugGetUrl.replace("{idOrSlug}", String(state.projectId)));
        loadReviews();
    }

    /**
     * Applies a whole filter set, resetting the table when the public state changes.
     *
     * The state filter depends on the projects in that state, so the resolved list is
     * dropped before the new one is looked up.
     */
    function setFilters(nextFilters: ReviewsQuery): void {
        const previousStates = readStateFilter(filters).sort().join(",");
        const nextStates = readStateFilter(nextFilters).sort().join(",");

        if (previousStates !== nextStates) {
            stateProjectIris = undefined;
            stateProjectsCache.clear();
            overflowToastShown = false;
        }

        filters = nextFilters;
        table.currentPage = 1;
    }

    function applyFilters(newFilters: ReviewsQuery): void {
        setFilters({ ...filters, ...newFilters });
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
        onCloseFilter: (newFilters: ReviewsQuery) => setFilters({ ...newFilters }),
        resource: "project_reviews",
    }}
    csv={{
        endpoint: apiProjectReviewsGetCollectionUrl,
        filenamePrefix: "review-projects",
        queryParams: csvQuery,
        totalItems: table.totalItems,
        disabled: stateFilterOverflow || stateFilterPending || stateProjectIris?.length === 0,
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
        emptyMessage={stateFilterOverflow
            ? "pages.admin.reviews.projects.filter.tooMany"
            : "pages.admin.projects.table.rows.noData"}
        onPageChange={table.handlePageChange}
        onItemsPerPageChange={table.handleItemsPerPageChange}
        onSortChange={table.handleSortChange}
        onStatusChange={handleStatusChange}
        onAssignAdvisor={handleAssignAdvisor}
    />
    <ReviewDecisionModal
        bind:open={decisionModalOpen}
        title={$t("pages.admin.reviews.projects.decisions.title")}
        description={decisionDescription}
        confirmLabel={$t("pages.admin.reviews.projects.decisions.confirm")}
        onConfirm={confirmStatusChange}
        onCancel={cancelStatusChange}
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

<Toast floating variant={toastVariant} bind:showToast>{toastMessage}</Toast>
