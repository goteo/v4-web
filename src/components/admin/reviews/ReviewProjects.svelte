<script lang="ts">
    import ReviewProjectsTable, {
        REVIEW_STATUSES,
        type ProjectStatus,
        type ReviewProjectRow,
    } from "./ReviewProjectsTable.svelte";
    import { t } from "../../../i18n/store";
    import {
        apiProjectsGetCollection,
        apiProjectsGetCollectionUrl,
        apiProjectsIdOrSlugGetUrl,
        apiProjectsIdPatch,
        apiProjectSupportsmoneyTotalGetCollection,
        apiUsersIdOrHandleGet,
        type Project,
        type User,
    } from "../../../openapi/client/index.ts";
    import { useAdminTableState } from "../../../utils/adminTableState.svelte";
    import { formatCurrency } from "../../../utils/currencies";
    import { extractId } from "../../../utils/extractId";
    import { getCollectionTotalItems, toCollectionItems } from "../../../utils/hydra";
    import Dashboard from "../AdminDashboard.svelte";
    import { projectSortMap, type ProjectSortKey } from "../projects/ProjectsTable.svelte";

    import type { ApiProjectsGetCollectionData } from "../../../openapi/client/types.gen";

    type ProjectsQuery = Partial<ApiProjectsGetCollectionData["query"]>;

    const table = useAdminTableState<ProjectSortKey>("date-desc", "review-projects-items-per-page");

    let filters: ProjectsQuery = $state({});
    let rows = $state<ReviewProjectRow[]>([]);
    let totalEarned = $state("—");

    let baseQuery = $derived<ProjectsQuery>({ "status[]": REVIEW_STATUSES, ...filters });

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
        totalEarned = formatCurrency(
            data?.amount ?? 0,
            data?.currency ?? import.meta.env.PUBLIC_DEFAULT_CURRENCY,
        );
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

    function toRow(project: Project, owner?: User): ReviewProjectRow {
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
        };
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

            rows = projects.map((p) => toRow(p, p.owner ? owners.get(p.owner) : undefined));
        } finally {
            table.isLoading = false;
        }
    }

    $effect(() => {
        loadProjects();
    });

    async function handleStatusChange(projectId: number, status: ProjectStatus): Promise<void> {
        const { error } = await apiProjectsIdPatch({
            path: { id: String(projectId) },
            body: { status },
        });
        if (error) console.error("Failed to update project status:", error);
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
    />
</Dashboard>
