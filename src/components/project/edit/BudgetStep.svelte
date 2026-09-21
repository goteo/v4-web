<script lang="ts">
    import BudgetCard from "./BudgetCard.svelte";
    import CreateCard from "./CreateCard.svelte";
    import { t } from "../../../i18n/store";
    import { withoutCache } from "../../../openapi/cacheInterceptor";
    import { apiProjectBudgetItemsGetCollection, type MoneyInput } from "../../../openapi/client";
    import { formatCurrency } from "../../../utils/currencies";
    import { addMoney } from "../../../utils/money";
    import Button from "../../library/buttons/Button.svelte";
    import Grid from "../../library/layout/Grid.svelte";
    import Title from "../../library/typography/Title.svelte";
    import LoadingSpinner from "../../search/LoadingSpinner.svelte";

    import type { ProjectDraftStore } from "../../../stores/drafts/draftsStore";

    let {
        draft,
    }: {
        draft: ProjectDraftStore;
    } = $props();

    let minBudgetItems = $state(loadMinBudgetItems());
    let minBudgetMoney = $derived.by(async () => {
        return minBudgetItems.then((items) => {
            let minTotal = items[0].money;
            items.slice(1).forEach((item) => {
                minTotal = addMoney(item.money, minTotal) as MoneyInput;
            });

            return minTotal;
        });
    });

    let optBudgetItems = $state(loadOptBudgetItems());
    let optBudgetMoney = $derived.by(async () => {
        return optBudgetItems.then((items) => {
            let optTotal = items[0].money;
            items.slice(1).forEach((item) => {
                optTotal = addMoney(item.money, optTotal) as MoneyInput;
            });

            return optTotal;
        });
    });

    async function loadMinBudgetItems() {
        return withoutCache(() =>
            apiProjectBudgetItemsGetCollection({
                baseUrl: "/api/relay",
                headers: { "Accept-Language": $draft.lang },
                query: { project: String($draft.actual.id), deadline: "minimum" },
            }).then(({ data, error }) => {
                if (error || !data) {
                    console.error(error);
                    return [];
                }

                return data;
            }),
        );
    }

    async function loadOptBudgetItems() {
        return withoutCache(() =>
            apiProjectBudgetItemsGetCollection({
                baseUrl: "/api/relay",
                headers: { "Accept-Language": $draft.lang },
                query: { project: String($draft.actual.id), deadline: "optimum" },
            }).then(({ data, error }) => {
                if (error || !data) {
                    console.error(error);
                    return [];
                }

                return data;
            }),
        );
    }

    function reloadBudgetItems() {
        minBudgetItems = loadMinBudgetItems();
        optBudgetItems = loadOptBudgetItems();
    }
</script>

<div class="flex flex-col gap-10">
    <div class="space-y-4">
        <Title level={1} variant="section">
            {$t("pages.project.edit.budget.title")}
        </Title>
        <p class="text-content text-base">{$t("pages.project.edit.budget.subtitle")}</p>
    </div>

    <div class="border-grey bg-variant1 flex flex-col gap-6 rounded-3xl border p-6 shadow-sm">
        <div class="flex items-center gap-3">
            <span
                class="bg-secondary flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
            >
                1
            </span>
            <span class="text-secondary text-3xl font-bold">
                {$t("domain.project.budget.minimum")}:
                {#await minBudgetMoney then minBudgetMoney}
                    {formatCurrency(minBudgetMoney)}
                {/await}
            </span>
        </div>
        <p class="text-content -mt-2 text-sm">
            {$t("pages.project.edit.budget.minimumSubtitle")}
        </p>
        {#await minBudgetItems}
            <LoadingSpinner size="lg" class="col-span-3 mx-auto my-10" />
        {:then minBudgetItems}
            <Grid class="grid-cols-1 sm:grid-cols-2">
                {#each minBudgetItems as item, index}
                    <BudgetCard
                        {item}
                        {draft}
                        onSave={reloadBudgetItems}
                        onDelete={reloadBudgetItems}
                    />
                {/each}
                <CreateCard
                    title={$t(`pages.project.edit.budget.add.minimum.title`)}
                    description={$t(`pages.project.edit.budget.add.minimum.description`)}
                    variant="budget"
                    deadline="minimum"
                    onSave={reloadBudgetItems}
                    {draft}
                />
            </Grid>
        {/await}
    </div>
    <div class="flex flex-col gap-6">
        <div class="flex items-center gap-3">
            <span
                class="border-secondary text-secondary flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold"
            >
                2
            </span>
            <span class="text-secondary text-3xl font-bold">
                {$t("domain.project.budget.optimum")}:
                {#await optBudgetMoney then optBudgetMoney}
                    {formatCurrency(optBudgetMoney)}
                {/await}
            </span>
        </div>
        <p class="text-content -mt-2 text-sm">
            {$t("pages.project.edit.budget.optimumSubtitle")}
        </p>
        {#await optBudgetItems}
            <LoadingSpinner size="lg" class="col-span-3 mx-auto my-10" />
        {:then optBudgetItems}
            <Grid class="grid-cols-1 sm:grid-cols-2">
                {#each optBudgetItems as item, i}
                    <BudgetCard
                        {item}
                        {draft}
                        onSave={reloadBudgetItems}
                        onDelete={reloadBudgetItems}
                    />
                {/each}
                <CreateCard
                    title={$t(`pages.project.edit.budget.add.optimum.title`)}
                    description={$t(`pages.project.edit.budget.add.optimum.description`)}
                    variant="budget"
                    deadline="optimum"
                    onSave={reloadBudgetItems}
                    {draft}
                />
            </Grid>
        {/await}
    </div>
</div>

<div class="mt-10 flex">
    <Button kind="secondary" size="md" class="min-w-50">
        {$t("pages.project.edit.budget.continue")}
    </Button>
</div>
