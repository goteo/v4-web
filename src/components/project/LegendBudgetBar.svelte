<script lang="ts">
    import { t } from "../../i18n/store";
    import { budgetTypeColors } from "../../utils/budgetColors";
    import { formatCurrency } from "../../utils/currencies";

    import type { ProjectBudgetItem, Project } from "../../openapi/client/index";

    interface Props {
        project: Project;
    }

    let { project }: Props = $props();

    const legendEntries = Object.entries(budgetTypeColors) as [ProjectBudgetItem["type"], string][];

    let minimumTotal = $derived(project.budget?.minimum?.money?.amount ?? 0);
    let optimumTotal = $derived(project.budget?.optimum?.money?.amount ?? 0);
    let totalBudget = $derived(minimumTotal + optimumTotal);
</script>

<div class="flex flex-row flex-wrap items-center justify-between gap-6">
    <div class="text-secondary text-base">
        <span>{$t("pages.project.view.tabs.budget.total")}:</span>
        <span class="font-bold">{formatCurrency(totalBudget)}</span>
    </div>

    <div class="flex flex-row flex-wrap gap-6">
        {#each legendEntries as [key, color]}
            <div class="flex flex-row items-center gap-2">
                <div class="h-4 w-6 rounded-sm" style="background-color: {color};"></div>
                <span class="text-base text-black capitalize">
                    {$t(`domain.project.budget.type.${key}`)}
                </span>
            </div>
        {/each}
    </div>
</div>
