<script lang="ts" module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import { TableBodyCell } from "flowbite-svelte";

    import DataTable, { type DataTableHeader, type SortOption } from "./DataTable.svelte";

    type Row = {
        id: number;
        name: string;
        email: string;
        amount: number;
    };

    const headers: DataTableHeader[] = [
        { key: "Name", sortable: true, sortKey: "name" },
        { key: "Email", sortable: true, sortKey: "email" },
        { key: "Amount", sortable: true, sortKey: "amount", class: "text-right" },
    ];

    const rows: Row[] = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Row ${i + 1}`,
        email: `row${i + 1}@example.com`,
        amount: (i + 1) * 25,
    }));

    const sortOptions: SortOption[] = [
        { key: "name-asc", field: "name", direction: "asc", label: "Name (A–Z)" },
        { key: "name-desc", field: "name", direction: "desc", label: "Name (Z–A)" },
        { key: "amount-desc", field: "amount", direction: "desc", label: "Amount (high)" },
        { key: "amount-asc", field: "amount", direction: "asc", label: "Amount (low)" },
    ];

    const { Story } = defineMeta({
        component: DataTable,
        title: "Library/DataTable",
        tags: ["autodocs"],
        args: {
            headers,
            rows,
            isLoading: false,
            emptyMessage: "No data available",
            sortOptions,
            selectedSort: "handle-asc",
            sortLabel: "Sort by",
            currentPage: 1,
            totalItems: 10,
            itemsPerPage: 10,
            itemsPerPageOptions: [10, 20, 30, 50],
            itemsPerPageLabel: "Rows per page",
        },
        argTypes: {
            isLoading: { control: "boolean" },
            emptyMessage: { control: "text" },
            sortLabel: { control: "text" },
            itemsPerPageLabel: { control: "text" },
        },
    });
</script>

<Story name="Default">
    <DataTable
        {headers}
        isLoading={false}
        emptyMessage="No data available"
        {rows}
        {sortOptions}
        selectedSort="handle-asc"
        sortLabel="Sort by"
        itemsPerPageLabel="Rows per page"
        itemsPerPageOptions={[10, 20, 30, 50]}
        itemsPerPage={10}
        currentPage={1}
        totalItems={10}
        onPageChange={() => {}}
        onItemsPerPageChange={() => {}}
        onSort={() => {}}
        onHeaderSort={() => {}}
    >
        {#snippet children(row)}
            <TableBodyCell class="p-4">{row.name}</TableBodyCell>
            <TableBodyCell class="p-4">{row.email}</TableBodyCell>
            <TableBodyCell class="p-4 text-right">{row.amount}</TableBodyCell>
        {/snippet}
    </DataTable>
</Story>

<Story name="Empty">
    <DataTable
        {headers}
        isLoading={false}
        emptyMessage="No rows to show"
        rows={[]}
        itemsPerPageLabel="Rows per page"
        itemsPerPageOptions={[10, 20, 30, 50]}
        itemsPerPage={10}
        currentPage={1}
        totalItems={0}
        onPageChange={() => {}}
        onItemsPerPageChange={() => {}}
    >
        {#snippet children(row)}
            <TableBodyCell class="p-4">{row.name}</TableBodyCell>
            <TableBodyCell class="p-4">{row.email}</TableBodyCell>
            <TableBodyCell class="p-4 text-right">{row.amount}</TableBodyCell>
        {/snippet}
    </DataTable>
</Story>

<Story name="Loading">
    <DataTable
        {headers}
        isLoading={true}
        emptyMessage="No data available"
        rows={[]}
        itemsPerPageLabel="Rows per page"
        itemsPerPageOptions={[10, 20, 30, 50]}
        itemsPerPage={10}
        currentPage={1}
        totalItems={0}
        onPageChange={() => {}}
        onItemsPerPageChange={() => {}}
    >
        {#snippet children(row)}
            <TableBodyCell class="p-4">{row.name}</TableBodyCell>
            <TableBodyCell class="p-4">{row.email}</TableBodyCell>
            <TableBodyCell class="p-4 text-right">{row.amount}</TableBodyCell>
        {/snippet}
    </DataTable>
</Story>

<Story name="WithSort">
    <DataTable
        {headers}
        isLoading={false}
        emptyMessage="No data available"
        {rows}
        {sortOptions}
        selectedSort="amount-desc"
        sortLabel="Sort by"
        itemsPerPageLabel="Rows per page"
        itemsPerPageOptions={[10, 20, 30, 50]}
        itemsPerPage={10}
        currentPage={1}
        totalItems={10}
        onPageChange={() => {}}
        onItemsPerPageChange={() => {}}
        onSort={() => {}}
        onHeaderSort={() => {}}
    >
        {#snippet children(row)}
            <TableBodyCell class="p-4">{row.name}</TableBodyCell>
            <TableBodyCell class="p-4">{row.email}</TableBodyCell>
            <TableBodyCell class="p-4 text-right">{row.amount}</TableBodyCell>
        {/snippet}
    </DataTable>
</Story>

<Story name="WithPagination">
    <DataTable
        {headers}
        isLoading={false}
        emptyMessage="No data available"
        rows={rows.slice(0, 10)}
        itemsPerPageLabel="Rows per page"
        itemsPerPageOptions={[10, 20, 30, 50]}
        itemsPerPage={10}
        currentPage={2}
        totalItems={47}
        onPageChange={() => {}}
        onItemsPerPageChange={() => {}}
    >
        {#snippet children(row)}
            <TableBodyCell class="p-4">{row.name}</TableBodyCell>
            <TableBodyCell class="p-4">{row.email}</TableBodyCell>
            <TableBodyCell class="p-4 text-right">{row.amount}</TableBodyCell>
        {/snippet}
    </DataTable>
</Story>

<Story name="ManyPages">
    <DataTable
        {headers}
        isLoading={false}
        emptyMessage="No data available"
        rows={rows.slice(0, 10)}
        itemsPerPageLabel="Rows per page"
        itemsPerPageOptions={[10, 20, 30, 50]}
        itemsPerPage={10}
        currentPage={13}
        totalItems={250}
        onPageChange={() => {}}
        onItemsPerPageChange={() => {}}
    >
        {#snippet children(row)}
            <TableBodyCell class="p-4">{row.name}</TableBodyCell>
            <TableBodyCell class="p-4">{row.email}</TableBodyCell>
            <TableBodyCell class="p-4 text-right">{row.amount}</TableBodyCell>
        {/snippet}
    </DataTable>
</Story>

<Story name="WithExpandedRow">
    <DataTable
        {headers}
        isLoading={false}
        emptyMessage="No data available"
        rows={[rows[0]]}
        itemsPerPageLabel="Rows per page"
        itemsPerPageOptions={[10, 20, 30, 50]}
        itemsPerPage={10}
        currentPage={1}
        totalItems={1}
        expandedRowIndex={0}
        onPageChange={() => {}}
        onItemsPerPageChange={() => {}}
    >
        {#snippet children(row)}
            <TableBodyCell class="p-4">{row.name}</TableBodyCell>
            <TableBodyCell class="p-4">{row.email}</TableBodyCell>
            <TableBodyCell class="p-4 text-right">{row.amount}</TableBodyCell>
        {/snippet}
        {#snippet details(row)}
            <div class="bg-purple-soft grid grid-cols-2 gap-4 rounded-lg p-6 text-sm">
                <div><span class="font-bold">ID:</span> {row.id}</div>
                <div><span class="font-bold">Email:</span> {row.email}</div>
            </div>
        {/snippet}
    </DataTable>
</Story>
