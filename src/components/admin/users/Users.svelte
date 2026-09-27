<script lang="ts">
    import UsersTable, { type UserRow, type UserSortKey } from "./UsersTable.svelte";
    import { t } from "../../../i18n/store";
    import { apiUsersGetCollection, type User } from "../../../openapi/client/index.ts";
    import { apiUsersGetCollectionUrl } from "../../../openapi/client/operation-paths.gen.ts";
    import { useAdminTableState } from "../../../utils/adminTableState.svelte";
    import { toCollectionItems } from "../../../utils/hydra";
    import {
        parseQueryFilters,
        splitOrderParams,
        syncQueryFiltersToUrl,
    } from "../../../utils/queryParams";
    import Dashboard from "../AdminDashboard.svelte";

    import type { ApiUsersGetCollectionData } from "../../../openapi/client/types.gen";

    type UsersQuery = Partial<NonNullable<ApiUsersGetCollectionData["query"]>>;

    const initialParams =
        typeof window !== "undefined"
            ? splitOrderParams(
                  parseQueryFilters(window.location.search, {
                      exclude: ["page", "itemsPerPage"],
                  }),
              )
            : { filters: {}, order: {} };

    const sortFieldMap: Record<
        UserSortKey,
        { field: "handle" | "email"; direction: "asc" | "desc" }
    > = {
        "handle-asc": { field: "handle", direction: "asc" },
        "handle-desc": { field: "handle", direction: "desc" },
    };

    const initialSort = ((Object.keys(sortFieldMap) as UserSortKey[]).find(
        (key) => initialParams.order[sortFieldMap[key].field] === sortFieldMap[key].direction,
    ) ?? "handle-asc") as UserSortKey;

    const table = useAdminTableState<UserSortKey>(initialSort);

    let filters: UsersQuery = $state(initialParams.filters ?? {});
    let userRows = $state<UserRow[]>([]);

    let userSlides = $derived([
        { title: $t("pages.admin.users.totalizers.selected"), amount: table.totalItems },
    ]);

    const sortMap: Record<string, { field: "handle"; direction: "asc" | "desc" }> = {
        "handle-asc": { field: "handle", direction: "asc" },
        "handle-desc": { field: "handle", direction: "desc" },
    };

    const initialSortKey = Object.keys(sortMap).find(
        (key) => initialParams.order[sortMap[key].field] === sortMap[key].direction,
    ) as UserSortKey | undefined;
    if (initialSortKey) table.selectedSort = initialSortKey;

    function buildUsersQuery(
        filters: UsersQuery,
        page: number,
        perPage: number,
        sort: UserSortKey,
    ): UsersQuery {
        const query = {
            page,
            itemsPerPage: perPage,
            ...filters,
        } as UsersQuery & Record<string, unknown>;

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

    async function loadUsers(): Promise<void> {
        table.isLoading = true;

        async function fetchUsers() {
            const query = buildUsersQuery(
                filters,
                table.currentPage,
                table.itemsPerPage,
                table.selectedSort,
            );

            return apiUsersGetCollection({
                baseUrl: "/api/relay",
                query,
                headers: {
                    Accept: "application/ld+json",
                    "Accept-Language": " ",
                },
            });
        }

        try {
            const { data: collection, response, error } = await fetchUsers();

            if (error) {
                console.error("Failed to fetch users:", error);
                return;
            }

            const loadedUsers = toCollectionItems<User>(collection);
            table.totalItems = getCollectionTotalItems(collection, response);

            userRows = loadedUsers.map((user): UserRow => {
                return {
                    id: user.id ?? 0,
                    handle: user.handle,
                    email: user.email,
                    displayName: user.displayName ?? "—",
                    type: user.type ?? "individual",
                    active: user.active ?? false,
                    roles: user.roles ?? [],
                    territory: user.territory?.country ?? "—",
                    accounting: user.accounting ?? "—",
                };
            });
        } finally {
            table.isLoading = false;
            table.isFirstLoad = false;
        }
    }

    function reloadUsers(): void {
        userRows = [];
        loadUsers();
    }

    $effect(() => {
        reloadUsers();
    });

    $effect(() => {
        const sortOption = sortFieldMap[table.selectedSort as UserSortKey];

        syncQueryFiltersToUrl(
            filters as Record<string, unknown>,
            sortOption ? { [sortOption.field]: sortOption.direction } : undefined,
        );
    });

    async function handleApplyFilters(newFilters: UsersQuery): Promise<void> {
        filters = { ...filters, ...newFilters };
        table.currentPage = 1;
    }

    function handleCloseFilter(newFilters: any): void {
        filters = { ...newFilters };
        table.currentPage = 1;
    }
</script>

<Dashboard
    title={$t("pages.admin.users.title")}
    description={$t("pages.admin.users.description")}
    filters={{
        resource: "users",
        filters: filters,
        onApplyFilters: handleApplyFilters,
        searchPlaceholder: $t("pages.admin.users.filters.search.placeholder"),
        onSelectUser: (u: User) => {
            filters = { ...filters, q: u.handle };
            table.currentPage = 1;
        },
    }}
    filterTags={{
        title: $t("pages.admin.users.lastUsers"),
        filters: filters,
        onCloseFilter: handleCloseFilter,
        resource: "users",
    }}
    csv={{
        endpoint: apiUsersGetCollectionUrl,
        filenamePrefix: "users",
        queryParams: filters,
        totalItems: table.totalItems,
    }}
    slider={{
        slides: userSlides,
        isLoading: table.isLoading,
    }}
>
    <UsersTable
        users={userRows}
        currentPage={table.currentPage}
        itemsPerPage={table.itemsPerPage}
        selectedSort={table.selectedSort}
        totalItems={table.totalItems}
        isLoading={table.isLoading}
        onPageChange={table.handlePageChange}
        onItemsPerPageChange={table.handleItemsPerPageChange}
        onSortChange={table.handleSortChange}
    />
</Dashboard>
