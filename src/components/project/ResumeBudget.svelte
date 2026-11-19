<script lang="ts">
    import BudgetBar from "./BudgetBar.svelte";
    import LegendBudgetBar from "./LegendBudgetBar.svelte";
    import { t } from "../../i18n/store";

    import type { Project, Accounting } from "../../openapi/client/index";

    interface Props {
        project: Project;
        accounting: Accounting;
    }

    let { project, accounting }: Props = $props();
</script>

<div class="flex flex-col gap-6 lg:flex-row lg:items-center">
    <div class="text-secondary basis-5/12 text-4xl font-bold">
        {$t("pages.project.view.tabs.budget.chartTitle")}
    </div>

    <div class="flex basis-7/12 flex-col gap-10 rounded-3xl bg-[#efeeff] px-6 pt-10 pb-6 shadow-sm">
        <BudgetBar {project} {accounting} />
        <LegendBudgetBar {project} />
    </div>
</div>
