<script lang="ts">
    import CategorizationTable, {
        type CategorizationRow,
        type CategorizationType,
    } from "./CategorizationTable.svelte";
    import CreateEditCategorizationModal from "./CreateEditCategorizationModal.svelte";
    import { session } from "../../../auth/store";
    import { locale, t } from "../../../i18n/store";
    import {
        apiCategoriesGetCollection,
        apiCategoriesIdDelete,
        apiThemesGetCollection,
        apiThemesIdDelete,
        type Category,
        type Theme,
    } from "../../../openapi/client/index.ts";
    import { toCollectionItems } from "../../../utils/hydra";
    import Button from "../../library/buttons/Button.svelte";
    import DeleteModal from "../../library/feedback/DeleteModal.svelte";
    import Title from "../../library/typography/Title.svelte";

    function authHeaders(): Record<string, string> {
        return Object.assign(
            { Accept: "application/ld+json" },
            ($session?.token.asHttpHeaders as Record<string, string>) ?? {},
        );
    }

    let categories = $state<Category[]>([]);
    let themes = $state<Theme[]>([]);
    let isLoading = $state(true);

    let modalOpen = $state(false);
    let modalMode = $state<"create" | "edit">("create");
    let modalType = $state<CategorizationType>("category");
    let editingItem = $state<Category | Theme | null>(null);

    let deleteOpen = $state(false);
    let deleteRow = $state<CategorizationRow | null>(null);

    const rows = $derived<CategorizationRow[]>([
        ...categories.map((item) => ({ type: "category" as const, item })),
        ...themes.map((item) => ({ type: "theme" as const, item })),
    ]);

    async function loadAll() {
        isLoading = true;
        try {
            const headers = { ...authHeaders(), "Accept-Language": $locale };

            const [categoriesResponse, themesResponse] = await Promise.all([
                apiCategoriesGetCollection({ baseUrl: "/api/relay", headers }),
                apiThemesGetCollection({ baseUrl: "/api/relay", headers }),
            ]);

            if (categoriesResponse.error || themesResponse.error) {
                console.error(
                    "Failed to load categories/themes:",
                    categoriesResponse.error ?? themesResponse.error,
                );
                return;
            }

            categories = toCollectionItems<Category>(categoriesResponse.data);
            themes = toCollectionItems<Theme>(themesResponse.data);
        } catch (error) {
            console.error("Failed to load categories/themes:", error);
        } finally {
            isLoading = false;
        }
    }

    $effect(() => {
        $locale;
        void loadAll();
    });

    function openCreate(type: CategorizationType) {
        modalType = type;
        modalMode = "create";
        editingItem = null;
        modalOpen = true;
    }

    function openEdit(row: CategorizationRow) {
        modalType = row.type;
        modalMode = "edit";
        editingItem = row.item;
        modalOpen = true;
    }

    function openDelete(row: CategorizationRow) {
        deleteRow = row;
        deleteOpen = true;
    }

    function typeKey(type: CategorizationType): string {
        return type === "category"
            ? "pages.admin.categorization.table.types.category"
            : "pages.admin.categorization.table.types.theme";
    }

    async function confirmDelete() {
        if (!deleteRow) return;

        const { type, item } = deleteRow;
        const id = item.id;

        if (!id) return;

        try {
            const headers = authHeaders();

            if (type === "category") {
                await apiCategoriesIdDelete({ baseUrl: "/api/relay", path: { id }, headers });
            } else {
                await apiThemesIdDelete({ baseUrl: "/api/relay", path: { id }, headers });
            }

            deleteOpen = false;
            deleteRow = null;
            await loadAll();
        } catch (error) {
            console.error("Failed to delete categorization item:", error);
        }
    }
</script>

<div class="wrapper">
    <div class="flex w-full flex-col gap-8 py-10">
        <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div class="flex flex-col gap-4">
                <Title level={2} variant="headline" weight="bold" color="default">
                    {$t("pages.admin.categorization.title")}
                </Title>
                <p class="text-content">
                    {$t("pages.admin.categorization.description")}
                </p>
            </div>
            <div class="flex shrink-0 flex-wrap items-center gap-2">
                <Button kind="secondary" onclick={() => openCreate("category")}>
                    {$t("pages.admin.categorization.actions.createCategory")}
                </Button>
                <Button onclick={() => openCreate("theme")}>
                    {$t("pages.admin.categorization.actions.createTheme")}
                </Button>
            </div>
        </header>

        <CategorizationTable {rows} {isLoading} onEdit={openEdit} onDelete={openDelete} />
    </div>
</div>

<CreateEditCategorizationModal
    bind:open={modalOpen}
    mode={modalMode}
    type={modalType}
    item={editingItem}
    onSaved={loadAll}
/>

<DeleteModal
    bind:open={deleteOpen}
    title={$t("pages.admin.categorization.delete.title", {
        type: deleteRow ? $t(typeKey(deleteRow.type)) : "",
    })}
    description={$t("pages.admin.categorization.delete.description", {
        name: deleteRow?.item.name ?? "",
    })}
    onclick={confirmDelete}
/>
