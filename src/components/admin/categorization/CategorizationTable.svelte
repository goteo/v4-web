<script lang="ts" module>
    import type { Category, Theme } from "../../../openapi/client/index.ts";

    export type CategorizationType = "category" | "theme";

    export interface CategorizationRow {
        type: CategorizationType;
        item: Category | Theme;
    }
</script>

<script lang="ts">
    import { TableBodyCell } from "flowbite-svelte";
    import { twMerge } from "tailwind-merge";

    import { t } from "../../../i18n/store";
    import { getLanguageDisplayName } from "../../../utils/lang";
    import Edit from "../../icons/actions/Edit.svelte";
    import Trash from "../../icons/actions/Trash.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import DataTable from "../../library/tables/DataTable.svelte";
    import Tag from "../../library/tags/Tag.svelte";

    import type { DataTableHeader } from "../../library/tables/DataTable.svelte";

    let {
        rows = [],
        isLoading = false,
        onEdit,
        onDelete,
    }: {
        rows: CategorizationRow[];
        isLoading: boolean;
        onEdit: (row: CategorizationRow) => void;
        onDelete: (row: CategorizationRow) => void;
    } = $props();

    const headers: DataTableHeader[] = [
        { key: "pages.admin.categorization.table.headers.name" },
        { key: "pages.admin.categorization.table.headers.slug" },
        { key: "pages.admin.categorization.table.headers.locales" },
        { key: "pages.admin.categorization.table.headers.type" },
        { key: "", class: "w-24" },
    ];
</script>

<DataTable
    {headers}
    {rows}
    {isLoading}
    emptyMessage="pages.admin.categorization.empty"
    currentPage={1}
    totalItems={rows.length}
    itemsPerPage={rows.length || 10}
>
    {#snippet children(row: CategorizationRow)}
        <TableBodyCell class="border-variant1 rounded-l-md border-t border-b border-l p-4">
            <span class="text-content font-medium">{row.item.name}</span>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            <span class="text-secondary text-sm">{row.item.slug ?? "—"}</span>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            {(row.item.locales ?? [])
                .map((code: string) => getLanguageDisplayName(code) ?? code)
                .join(", ") || "—"}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            <Tag
                variant="bold"
                class={twMerge(
                    "text-secondary w-fit",
                    row.type === "category" ? "bg-variant1" : "bg-variant2",
                )}
            >
                {row.type === "category"
                    ? $t("pages.admin.categorization.table.types.category")
                    : $t("pages.admin.categorization.table.types.theme")}
            </Tag>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 rounded-r-md border-t border-r border-b p-2">
            <div class="flex items-center justify-end gap-1">
                <Button
                    kind="ghost"
                    size="sm"
                    class="rounded-full p-2.5"
                    onclick={() => onEdit(row)}
                >
                    <Edit class="size-5" />
                </Button>
                <Button
                    kind="ghost"
                    size="sm"
                    class="text-tertiary inset-ring-tertiary rounded-full p-3"
                    onclick={() => onDelete(row)}
                >
                    <Trash class="size-4 text-current" />
                </Button>
            </div>
        </TableBodyCell>
    {/snippet}
</DataTable>
