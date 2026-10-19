<script lang="ts">
    import ProjectsModalAnnotations from "./ProjectsModalAnnotations.svelte";
    // Paid modal hidden until the API persists the paid amount.
    // import ProjectsModalPaid from "./ProjectsModalPaid.svelte";
    import ProjectsTable, { type ProjectRow, type ProjectSortKey } from "./ProjectsTable.svelte";
    import { t } from "../../../i18n/store";
    import {
        apiProjectsGetCollection,
        apiProjectsIdPatch,
        apiAccountingsIdGet,
        apiUsersIdOrHandleGet,
        apiProjectSupportsmoneyTotalGetCollection,
        apiProjectsGetCollectionUrl,
        type Project,
        type Accounting,
        type User,
    } from "../../../openapi/client/index.ts";
    import { useAdminTableState } from "../../../utils/adminTableState.svelte";
    import { formatCurrency } from "../../../utils/currencies";
    import { extractId } from "../../../utils/extractId";
    import { toCollectionItems } from "../../../utils/hydra";
    import {
        parseQueryFilters,
        splitOrderParams,
        syncQueryFiltersToUrl,
    } from "../../../utils/queryParams";
    import Toast from "../../library/feedback/Toast.svelte";
    import Dashboard from "../AdminDashboard.svelte";

    import type {
        ApiProjectSupportsmoneyTotalGetCollectionData,
        ApiProjectsGetCollectionData,
    } from "../../../openapi/client/types.gen";
    import type { ProjectStatus } from "../../../utils/projectStatus";

    type ProjectsQuery = Partial<ApiProjectsGetCollectionData["query"]>;

    const initialParams =
        typeof window !== "undefined"
            ? splitOrderParams(
                  parseQueryFilters(window.location.search, {
                      exclude: ["page", "itemsPerPage"],
                  }),
              )
            : { filters: {}, order: {} };

    const sortFieldMap: Record<
        ProjectSortKey,
        { field: "dateCreated" | "dateUpdated"; direction: "asc" | "desc" }
    > = {
        "date-desc": { field: "dateCreated", direction: "desc" },
        "date-asc": { field: "dateCreated", direction: "asc" },
    };

    const initialSort = ((Object.keys(sortFieldMap) as ProjectSortKey[]).find(
        (key) => initialParams.order[sortFieldMap[key].field] === sortFieldMap[key].direction,
    ) ?? "date-desc") as ProjectSortKey;

    const table = useAdminTableState<ProjectSortKey>(initialSort);

    let filters: ProjectsQuery = $state(initialParams.filters);
    let projectRows = $state<ProjectRow[]>([]);
    let totalEarned = $state("—");

    let accountingsCache = $state(new Map<string, Accounting>());
    let ownersCache = $state(new Map<string, User>());

    let userEmailById = $derived.by(() => {
        const map = new Map<number, string>();
        for (const project of projectRows) {
            const owner = ownersCache.get(project.owner);
            if (owner?.email && project.id) {
                map.set(project.id, owner.email);
            }
        }
        return map;
    });

    let annotationsCache = $state(new Map<number, string>());
    // let paidModalOpen = $state(false);
    let annotationsModalOpen = $state(false);
    // let paidValue = $state("");
    // let maxAchievedValue = $state("");
    let annotationText = $state("");
    let selectedProjectId = $state(0);
    let showError = $state(false);
    let errorMessage = $state("");

    let projectSlides = $derived([
        { title: $t("pages.admin.projects.totalizers.selected"), amount: table.totalItems },
        { title: $t("pages.admin.projects.totalizers.totalEarned"), amount: totalEarned },
    ]);

    /**
     * Totals the money earned by every project matching the table filters (not only the
     * current page): `money_total` takes the same filters as the projects collection under `project.`.
     */
    async function fetchTotalEarned(projectFilters: ProjectsQuery) {
        const query = Object.fromEntries(
            Object.entries(projectFilters ?? {}).map(([key, value]) => [`project.${key}`, value]),
        ) as ApiProjectSupportsmoneyTotalGetCollectionData["query"];

        const { data, error } = await apiProjectSupportsmoneyTotalGetCollection({
            baseUrl: "/api/relay",
            query,
        });
        if (error || !data) {
            console.error("Failed to fetch money total:", error);
            totalEarned = "—";
            return;
        }
        totalEarned = formatCurrency(data.amount ?? 0, data.currency);
    }

    function buildProjectsQuery(
        filters: ProjectsQuery,
        page: number,
        perPage: number,
        sort: ProjectSortKey,
    ): ProjectsQuery {
        const query: ProjectsQuery = {
            page,
            itemsPerPage: perPage,
            ...filters,
        };

        const sortOption = sortFieldMap[sort];
        if (sortOption) {
            query[`order[${sortOption.field}]`] = sortOption.direction;
        }

        return query;
    }

    function getCollectionTotalItems(collection: unknown, response?: Response): number {
        if (Array.isArray(collection)) {
            const headerTotal =
                response?.headers.get("X-Total-Items") ??
                response?.headers.get("Content-Range")?.split("/")[1];
            if (headerTotal) return Number(headerTotal);
            return collection.length;
        }
        if (!collection || typeof collection !== "object") return 0;
        const record = collection as Record<string, unknown>;
        const total = record.totalItems ?? record["hydra:totalItems"];
        return typeof total === "number"
            ? total
            : ((record["hydra:member"] as unknown[])?.length ?? 0);
    }

    async function loadProjects(): Promise<void> {
        table.isLoading = true;

        async function fetchProjects() {
            const query = buildProjectsQuery(
                filters,
                table.currentPage,
                table.itemsPerPage,
                table.selectedSort,
            );

            return apiProjectsGetCollection({
                baseUrl: "/api/relay",
                query,
                headers: {
                    Accept: "application/ld+json",
                    "Accept-Language": " ",
                },
            });
        }

        try {
            const { data: collection, response, error } = await fetchProjects();

            if (error) {
                console.error("Failed to fetch projects:", error);
                return;
            }

            const loadedProjects = toCollectionItems<Project>(collection);
            table.totalItems = getCollectionTotalItems(collection, response);

            const uniqueAccountingIris = [
                ...new Set(loadedProjects.map((p) => p.accounting).filter(Boolean)),
            ] as string[];
            const uniqueOwnerIris = [
                ...new Set(loadedProjects.map((p) => p.owner).filter(Boolean)),
            ] as string[];

            const missingAccountingIris = uniqueAccountingIris.filter(
                (iri) => !accountingsCache.has(iri),
            );
            const missingOwnerIris = uniqueOwnerIris.filter((iri) => !ownersCache.has(iri));

            const [accountingResults, ownerResults] = await Promise.all([
                Promise.all(
                    missingAccountingIris.map(async (iri) => {
                        const accId = extractId(iri);
                        if (!accId) return null;
                        const { data } = await apiAccountingsIdGet({
                            baseUrl: "/api/relay",
                            path: { id: accId },
                        });
                        return data ? ([iri, data] as const) : null;
                    }),
                ),
                Promise.all(
                    missingOwnerIris.map(async (iri) => {
                        const ownerId = extractId(iri);
                        if (!ownerId) return null;
                        const { data } = await apiUsersIdOrHandleGet({
                            baseUrl: "/api/relay",
                            path: { idOrHandle: ownerId },
                        });
                        return data ? ([iri, data] as const) : null;
                    }),
                ),
            ]);

            for (const [iri, accounting] of accountingResults.filter(Boolean) as [
                string,
                Accounting,
            ][]) {
                accountingsCache.set(iri, accounting);
            }
            for (const [iri, owner] of ownerResults.filter(Boolean) as [string, User][]) {
                ownersCache.set(iri, owner);
            }

            projectRows = loadedProjects.map((project): ProjectRow => {
                const accounting = project.accounting
                    ? accountingsCache.get(project.accounting)
                    : undefined;
                const owner = project.owner ? ownersCache.get(project.owner) : undefined;
                const balance = accounting?.balance;
                const calendar = project.calendar;
                const min = project.budget?.minimum?.money;
                const opt = project.budget?.optimum?.money;

                return {
                    id: project.id ?? 0,
                    name: project.title,
                    slug: project.slug ?? String(project.id),
                    promoter: owner?.displayName ?? owner?.email ?? "—",
                    promoterHandle: owner?.handle ?? "",
                    achieved: balance ? formatCurrency(balance.amount, balance.currency) : "—",
                    paid: "—",
                    paidMatchfunding: "—",
                    status: project.status ?? "in_draft",
                    datePublished: calendar?.release ?? "—",
                    dateEnd1: calendar?.minimum ?? "—",
                    dateEnd2: calendar?.optimum ?? "—",
                    minOptim:
                        min && opt
                            ? `${formatCurrency(min.amount, min.currency)} - ${formatCurrency(opt.amount, opt.currency)}`
                            : "—",
                    remaining: "—",
                    annotationsCount: 0,
                    annotations: "",
                    accounting: project.accounting ?? "",
                    owner: project.owner ?? "",
                };
            });
        } finally {
            table.isLoading = false;
            table.isFirstLoad = false;
        }
    }

    function reloadProjects(): void {
        accountingsCache = new Map();
        ownersCache = new Map();
        projectRows = [];
        loadProjects();
    }

    $effect(() => {
        reloadProjects();
    });

    $effect(() => {
        fetchTotalEarned(filters);
    });

    $effect(() => {
        const sortOption = sortFieldMap[table.selectedSort];

        syncQueryFiltersToUrl(
            (filters ?? {}) as Record<string, unknown>,
            sortOption ? { [sortOption.field]: sortOption.direction } : undefined,
        );
    });

    async function handleApplyFilters(newFilters: ProjectsQuery): Promise<void> {
        filters = { ...filters, ...newFilters };
        table.currentPage = 1;
    }

    function handleCloseFilter(newFilters: any): void {
        filters = { ...newFilters };
        table.currentPage = 1;
    }

    /** The API rejects transitions that break the project life-cycle; those surface as a toast. */
    async function handleStatusChange(projectId: number, status: ProjectStatus): Promise<boolean> {
        const { error } = await apiProjectsIdPatch({
            baseUrl: "/api/relay",
            path: { id: String(projectId) },
            body: { status },
        });
        if (error) {
            const detail = (error as { detail?: string | null }).detail;
            errorMessage = `${$t("pages.admin.projects.table.rows.details.statusChangeError")}${detail ? `: ${detail}` : ""}`;
            showError = true;
            return false;
        }
        const row = projectRows.find((p) => p.id === projectId);
        if (row) row.status = status;
        return true;
    }

    // Re-enable with `onOpenPaidModal={openPaidModal}` on <ProjectsTable> and the modal below.
    // function openPaidModal(project: ProjectRow, e: MouseEvent) {
    //     e.stopPropagation();
    //     selectedProjectId = project.id;
    //     paidValue = project.paid !== "—" ? project.paid : "";
    //     maxAchievedValue = project.achieved !== "—" ? project.achieved : "";
    //     paidModalOpen = true;
    // }

    function openAnnotationsModal(project: ProjectRow, e: MouseEvent) {
        e.stopPropagation();
        selectedProjectId = project.id;
        annotationText = annotationsCache.get(project.id) ?? project.annotations;
        annotationsModalOpen = true;
    }

    // function handleSavePaid() {
    //     reloadProjects();
    //     paidModalOpen = false;
    // }

    function handleSaveAnnotations() {
        annotationsCache = new Map(annotationsCache).set(selectedProjectId, annotationText);
        const project = projectRows.find((p) => p.id === selectedProjectId);
        if (project) {
            project.annotations = annotationText;
            project.annotationsCount = annotationText ? 1 : 0;
        }
        annotationsModalOpen = false;
    }
</script>

<Dashboard
    title={$t("pages.admin.projects.title")}
    description={$t("pages.admin.projects.description")}
    filters={{
        resource: "projects",
        filters: filters,
        onApplyFilters: handleApplyFilters,
        searchPlaceholder: $t("pages.admin.projects.filters.search.placeholder"),
        onSelectProject: (p: Project) => {
            filters = { ...filters, title: p.title };
            table.currentPage = 1;
        },
    }}
    filterTags={{
        title: $t("pages.admin.projects.lastProjects"),
        filters: filters,
        onCloseFilter: handleCloseFilter,
        resource: "projects",
    }}
    csv={{
        endpoint: apiProjectsGetCollectionUrl,
        filenamePrefix: "projects",
        queryParams: filters,
        totalItems: table.totalItems,
    }}
    slider={{
        slides: projectSlides,
        isLoading: table.isLoading,
    }}
>
    <ProjectsTable
        projects={projectRows}
        currentPage={table.currentPage}
        itemsPerPage={table.itemsPerPage}
        selectedSort={table.selectedSort}
        totalItems={table.totalItems}
        isLoading={table.isLoading}
        {userEmailById}
        onPageChange={table.handlePageChange}
        onItemsPerPageChange={table.handleItemsPerPageChange}
        onSortChange={table.handleSortChange}
        onStatusChange={handleStatusChange}
        onOpenAnnotationsModal={openAnnotationsModal}
    />
</Dashboard>

<!-- Paid modal hidden until the API persists the paid amount.
<ProjectsModalPaid
    bind:open={paidModalOpen}
    bind:paidValue
    maxAchieved={maxAchievedValue}
    onsave={handleSavePaid}
/>
-->
<Toast floating variant="error" bind:showToast={showError}>{errorMessage}</Toast>
<ProjectsModalAnnotations
    bind:open={annotationsModalOpen}
    bind:annotationText
    onsave={handleSaveAnnotations}
/>
