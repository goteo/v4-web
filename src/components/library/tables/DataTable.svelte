<script lang="ts" module>
    export type SortDirection = "asc" | "desc";

    export interface SortOption {
        key: string;
        field: string;
        direction: SortDirection;
        label: string;
    }

    export interface DataTableHeader {
        key: string;
        sortable?: boolean;
        sortKey?: string;
        class?: string;
    }
</script>

<script lang="ts">
    import {
        Table,
        TableBody,
        TableBodyCell,
        TableBodyRow,
        TableHead,
        TableHeadCell,
    } from "flowbite-svelte";

    import { t } from "../../../i18n/store";
    import Loader from "../feedback/Loader.svelte";
    import Pagination from "../paginations/Pagination.svelte";

    import type { AdminItemsPerPage } from "../../../utils/adminTable";
    import type { ChargeSortKey } from "../../admin/charges/ChargesTable.svelte";
    import type { ProjectSortKey } from "../../admin/projects/ProjectsTable.svelte";
    import type { UserSortKey } from "../../admin/users/UsersTable.svelte";
    import type { Snippet } from "svelte";

    export type SupportedSortKeys = ChargeSortKey | ProjectSortKey | UserSortKey;

    interface Props {
        headers: DataTableHeader[];
        rows: any[];
        isLoading: boolean;
        emptyMessage: string;
        sortOptions?: SortOption[];
        selectedSort?: SupportedSortKeys;
        sortLabel?: string;
        onSort?: (sortKey: SupportedSortKeys) => void;
        onHeaderSort?: (field: string) => void;
        currentPage?: number;
        totalItems?: number;
        itemsPerPage?: number;
        itemsPerPageOptions?: number[];
        itemsPerPageLabel?: string;
        onPageChange?: (page: number) => void;
        onItemsPerPageChange?: (value: AdminItemsPerPage) => void;
        onRowClick?: (row: any, index: number) => void;
        expandedRowIndex?: number | null;
        children: Snippet<[row: any, index: number]>;
        details?: Snippet<[row: any, index: number]>;
    }

    let {
        headers,
        rows,
        isLoading,
        emptyMessage,
        sortOptions,
        selectedSort,
        sortLabel,
        onSort,
        onHeaderSort,
        currentPage = 1,
        totalItems = 0,
        itemsPerPage = 10,
        itemsPerPageOptions,
        itemsPerPageLabel,
        onPageChange,
        onItemsPerPageChange,
        onRowClick,
        expandedRowIndex = $bindable<number | null>(null),
        children,
        details,
    }: Props = $props();

    const currentSort = $derived(sortOptions?.find((o) => o.key === selectedSort) ?? null);

    function getSortIndicator(header: DataTableHeader): string {
        if (!header.sortable) return "";
        if (!currentSort) return "↕";
        const field = header.sortKey ?? header.key;
        if (currentSort.field === field) {
            return currentSort.direction === "asc" ? "▲" : "▼";
        }
        return "↕";
    }

    const hasSort = $derived(!!sortOptions && sortOptions.length > 0 && !!onSort);
    const hasPagination = $derived(
        currentPage !== undefined && totalItems !== undefined && !!onPageChange,
    );
    const hasItemsPerPage = $derived(
        !!itemsPerPageLabel && !!onItemsPerPageChange && !!itemsPerPageOptions,
    );
</script>

<div class="space-y-6">
    <div class="space-y-4">
        {#if hasSort && hasItemsPerPage}
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-row items-center gap-2">
                    <p class="text-content font-bold">
                        {$t(sortLabel ?? "")}
                    </p>
                    <select
                        value={selectedSort}
                        onchange={(e) => onSort?.(e.currentTarget.value as SupportedSortKeys)}
                        class="border-secondary text-secondary min-w-50 rounded-sm py-1"
                        disabled={isLoading}
                    >
                        {#each sortOptions! as option}
                            <option value={option.key}>{$t(option.label)}</option>
                        {/each}
                    </select>
                </div>

                <div class="flex flex-row items-center gap-2">
                    <p class="text-content font-bold">{$t(itemsPerPageLabel!)}</p>
                    <select
                        value={itemsPerPage}
                        onchange={(e) =>
                            onItemsPerPageChange?.(
                                Number(e.currentTarget.value) as AdminItemsPerPage,
                            )}
                        class="border-secondary text-secondary rounded-sm py-1"
                        disabled={isLoading}
                    >
                        {#each itemsPerPageOptions! as option}
                            <option value={option}>{option}</option>
                        {/each}
                    </select>
                </div>
            </div>
        {/if}

        <div class="overflow-x-auto">
            <Table class="w-full table-fixed border-separate border-spacing-y-2">
                <TableHead>
                    {#each headers as header, i}
                        <TableHeadCell
                            class="bg-black p-4 text-base text-white first:rounded-l-lg last:rounded-r-lg {header.sortable
                                ? 'hover:bg-opacity-80 cursor-pointer select-none'
                                : ''} {header.class ?? ''}"
                            onclick={(e: MouseEvent) => {
                                if (!header.sortable) return;
                                onHeaderSort?.(header.sortKey ?? header.key);
                            }}
                        >
                            <div class="flex items-center justify-between">
                                <span class="normal-case">{$t(header.key)}</span>
                                {#if header.sortable}
                                    <span class="ml-2 text-sm opacity-70">
                                        {getSortIndicator(header)}
                                    </span>
                                {/if}
                            </div>
                        </TableHeadCell>
                    {/each}
                </TableHead>

                <TableBody class="text-base">
                    {#if isLoading && rows.length === 0}
                        <TableBodyRow>
                            <TableBodyCell colspan={headers.length}>
                                <div class="flex justify-center py-6">
                                    <Loader />
                                </div>
                            </TableBodyCell>
                        </TableBodyRow>
                    {:else if rows.length === 0}
                        <TableBodyRow>
                            <TableBodyCell colspan={headers.length} class="text-center">
                                {$t(emptyMessage)}
                            </TableBodyCell>
                        </TableBodyRow>
                    {:else}
                        {#each rows as row, index}
                            <TableBodyRow
                                class="border-variant1 hover:bg-purple-soft text-content border bg-white transition-colors {onRowClick
                                    ? 'cursor-pointer'
                                    : ''}"
                                onclick={() => onRowClick?.(row, index)}
                            >
                                {@render children(row, index)}
                            </TableBodyRow>
                            {#if details && expandedRowIndex === index}
                                <TableBodyRow>
                                    <TableBodyCell colspan={headers.length}>
                                        {@render details(row, index)}
                                    </TableBodyCell>
                                </TableBodyRow>
                            {/if}
                        {/each}
                        {#if isLoading}
                            <TableBodyRow>
                                <TableBodyCell colspan={headers.length}>
                                    <div class="flex justify-center py-4">
                                        <Loader />
                                    </div>
                                </TableBodyCell>
                            </TableBodyRow>
                        {/if}
                    {/if}
                </TableBody>
            </Table>
        </div>
    </div>

    {#if hasPagination}
        {#if hasItemsPerPage && !hasSort}
            <div class="flex justify-end">
                <div class="flex flex-row items-center gap-2">
                    <p class="text-content font-bold">{$t(itemsPerPageLabel!)}</p>
                    <select
                        value={itemsPerPage}
                        onchange={(e) =>
                            onItemsPerPageChange?.(
                                Number(e.currentTarget.value) as AdminItemsPerPage,
                            )}
                        class="border-secondary text-secondary rounded-sm py-1"
                        disabled={isLoading}
                    >
                        {#each itemsPerPageOptions! as option}
                            <option value={option}>{option}</option>
                        {/each}
                    </select>
                </div>
            </div>
        {/if}
        <Pagination {currentPage} {totalItems} {itemsPerPage} {isLoading} {onPageChange} />
    {/if}
</div>
