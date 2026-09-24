<script lang="ts" module>
    import type { DataTableHeader, SortOption } from "../../library/tables/DataTable.svelte";

    export type UserRow = {
        id: number;
        handle: string;
        email: string;
        displayName: string;
        type: string;
        active: boolean;
        roles: string[];
        territory: string;
        accounting?: string;
    };

    export type UserSortKey = "handle-asc" | "handle-desc";

    export const USER_ITEMS_PER_PAGE_LABEL = "pages.admin.users.filters.itemsPerPage.title";

    export const userSortMap: Record<UserSortKey, { field: "handle"; direction: "asc" | "desc" }> =
        {
            "handle-asc": { field: "handle", direction: "asc" },
            "handle-desc": { field: "handle", direction: "desc" },
        };

    export const userSortOptions: SortOption[] = (Object.keys(userSortMap) as UserSortKey[]).map(
        (key) => ({
            key,
            field: userSortMap[key].field,
            direction: userSortMap[key].direction,
            label: `pages.admin.users.filters.order.options.${key}`,
        }),
    );

    export const userTableHeaders: DataTableHeader[] = [
        { key: "pages.admin.users.table.headers.handle" },
        { key: "pages.admin.users.table.headers.email" },
        { key: "pages.admin.users.table.headers.displayName" },
        { key: "pages.admin.users.table.headers.type" },
        { key: "pages.admin.users.table.headers.active" },
        { key: "pages.admin.users.table.headers.roles" },
        { key: "", class: "w-12" },
    ];
</script>

<script lang="ts">
    import { TableBodyCell } from "flowbite-svelte";

    import UsersDetailsRow from "./UsersDetailsRow.svelte";
    import { t } from "../../../i18n/store";
    import {
        ADMIN_ITEMS_PER_PAGE_OPTIONS,
        type AdminItemsPerPage,
    } from "../../../utils/adminTable";
    import Chevron from "../../icons/navigation/Chevron.svelte";
    import DataTable from "../../library/tables/DataTable.svelte";

    let {
        users = [],
        currentPage = 1,
        totalItems = 0,
        itemsPerPage = ADMIN_ITEMS_PER_PAGE_OPTIONS[0],
        isLoading = false,
        selectedSort = $bindable<UserSortKey>("handle-asc"),
        onPageChange,
        onItemsPerPageChange,
        onSortChange,
    }: {
        users: UserRow[];
        currentPage: number;
        totalItems: number;
        itemsPerPage: AdminItemsPerPage;
        isLoading: boolean;
        selectedSort: UserSortKey;
        onPageChange?: (page: number) => void;
        onItemsPerPageChange?: (perPage: AdminItemsPerPage) => void;
        onSortChange?: (sort: UserSortKey) => void;
    } = $props();

    let openRow = $state<number | null>(null);

    const roleStyles: Record<string, string> = {
        ROLE_USER: "bg-blue-100 text-blue-800",
        ROLE_ADMIN: "bg-purple-100 text-purple-800",
        ROLE_SUPER_ADMIN: "bg-red-100 text-red-800",
        default: "bg-gray-200 text-gray-700",
    };

    function roleLabel(role: string): string {
        return $t(`pages.admin.users.table.rows.roles.${role}`, { default: role });
    }

    function toggleRow(_row: UserRow, index: number): void {
        openRow = openRow === index ? null : index;
    }
</script>

<DataTable
    headers={userTableHeaders}
    rows={users}
    {isLoading}
    emptyMessage="pages.admin.users.table.rows.noData"
    {currentPage}
    {totalItems}
    {itemsPerPage}
    itemsPerPageLabel={USER_ITEMS_PER_PAGE_LABEL}
    itemsPerPageOptions={[...ADMIN_ITEMS_PER_PAGE_OPTIONS]}
    sortOptions={userSortOptions}
    {selectedSort}
    sortLabel="pages.admin.users.filters.order.title"
    {onPageChange}
    {onItemsPerPageChange}
    onSort={(k) => onSortChange?.(k as UserSortKey)}
    onHeaderSort={(k) => onSortChange?.(k as UserSortKey)}
    onRowClick={toggleRow}
    bind:expandedRowIndex={openRow}
>
    {#snippet children(user, i)}
        <TableBodyCell class="border-variant1 max-w-60 rounded-l-md border-t border-b border-l p-4">
            <p class="truncate font-medium text-black">{user.handle}</p>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4 text-sm">
            <span class="block truncate">{user.email}</span>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4 text-sm">
            <span class="block truncate">{user.displayName}</span>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4 text-sm">
            <span
                class="rounded-full px-3 py-1 text-xs font-medium"
                class:bg-purple-100={user.type === "individual"}
                class:text-purple-800={user.type === "individual"}
                class:bg-blue-100={user.type === "organization"}
                class:text-blue-800={user.type === "organization"}
            >
                {$t(`pages.admin.users.table.rows.type.${user.type}`, {
                    default: user.type,
                })}
            </span>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4 text-sm">
            {#if user.active}
                <span
                    class="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800"
                >
                    {$t("pages.admin.users.table.rows.active")}
                </span>
            {:else}
                <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    {$t("pages.admin.users.table.rows.inactive")}
                </span>
            {/if}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4 text-sm">
            <div class="flex flex-wrap gap-1">
                {#each user.roles as role}
                    <span
                        class="rounded-full px-2 py-0.5 text-xs font-medium {roleStyles[role] ??
                            roleStyles.default}"
                    >
                        {roleLabel(role)}
                    </span>
                {/each}
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
    {#snippet details(user)}
        <UsersDetailsRow {user} />
    {/snippet}
</DataTable>
