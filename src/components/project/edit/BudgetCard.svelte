<script lang="ts">
    import BudgetModal from "./BudgetModal.svelte";
    import { t } from "../../../i18n/store";
    import {
        apiProjectBudgetItemsIdDelete,
        apiProjectBudgetItemsIdPatch,
        type ProjectBudgetItem,
    } from "../../../openapi/client";
    import { budgetTypeClasses } from "../../../utils/budgetColors";
    import { formatCurrency } from "../../../utils/currencies";
    import Close from "../../icons/navigation/Close.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import DeleteModal from "../../library/feedback/DeleteModal.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { ProjectDraftStore } from "../../../stores/drafts/draftsStore";

    let {
        draft,
        item,
        onSave,
        onDelete,
    }: {
        draft: ProjectDraftStore;
        item: ProjectBudgetItem;
        onSave?: (item: ProjectBudgetItem) => void;
        onDelete?: (item: ProjectBudgetItem) => void;
    } = $props();

    let openModal = $state(false);
    let openDeleteModal = $state(false);

    async function handleSave(newItem: ProjectBudgetItem) {
        const { data, error } = await apiProjectBudgetItemsIdPatch({
            baseUrl: "/api/relay",
            headers: { "Content-Language": $draft.lang },
            path: { id: String(item.id) },
            body: newItem,
        });

        if (!error) {
            item = data;
            openModal = false;
            onSave?.(newItem);
            return;
        }

        console.error(error);
    }

    async function handleDelete(item: ProjectBudgetItem) {
        const { error } = await apiProjectBudgetItemsIdDelete({
            baseUrl: "/api/relay",
            path: { id: String(item.id) },
        });

        if (!error) {
            openModal = false;
            onDelete?.(item);
            return;
        }

        console.error(error);
    }
</script>

<div
    class="border-grey relative flex w-full flex-col justify-between gap-4 rounded-4xl border bg-white p-6 font-bold shadow-sm"
>
    <button
        type="button"
        aria-label={$t("common.delete")}
        class="text-secondary absolute top-6 right-6 cursor-pointer transition-transform hover:scale-110"
        onclick={() => (openDeleteModal = true)}
    >
        <Close class="size-5" />
    </button>
    <div class="flex flex-col gap-4">
        <div class="flex items-center gap-2">
            <span
                class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {item.deadline ===
                'minimum'
                    ? 'bg-secondary text-white'
                    : 'border-secondary text-secondary border'}"
            >
                {item.deadline === "minimum"
                    ? $t("domain.project.budget.minimum")
                    : $t("domain.project.budget.optimum")}
            </span>
        </div>
        <Title level={2} variant="subsection" color="secondary" truncate={1}>
            {item.title}
        </Title>
        <p class="text-content line-clamp-3 font-normal">
            {item.description}
        </p>
    </div>
    <div class="mt-auto flex flex-row items-center justify-between">
        <p class="text-2xl text-black">
            {formatCurrency(item.money.amount, item.money.currency)}
        </p>
        <div class="flex items-center gap-2">
            <div
                class="inline-block h-2.5 w-5 rounded-lg {budgetTypeClasses[
                    item.type as ProjectBudgetItem['type']
                ]}"
            ></div>
            <span class="text-content text-sm">
                {$t(`domain.project.budget.type.${item.type}`)}
            </span>
        </div>
    </div>

    <Button kind="secondary" class="w-full" onclick={() => (openModal = true)}>
        {$t("common.edit")}
    </Button>

    <BudgetModal {draft} {item} bind:open={openModal} onSave={handleSave} onDelete={handleDelete} />
    <DeleteModal
        bind:open={openDeleteModal}
        title={$t("pages.project.edit.budget.deleteModal.title")}
        description={$t("pages.project.edit.budget.deleteModal.description")}
        onclick={() => handleDelete(item)}
    />
</div>
