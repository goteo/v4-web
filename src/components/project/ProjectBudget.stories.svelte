<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import { delay, http, HttpResponse } from "msw";
    import { expect } from "storybook/test";

    import ProjectBudget from "./ProjectBudget.svelte";
    import es from "../../i18n/locales/es.json";

    const eur = (amount) => ({ amount, currency: "EUR" });

    const project = {
        id: 1,
        budget: {
            minimum: { money: eur(500000), task: eur(300000), material: eur(200000) },
            optimum: { money: eur(200000), infrastructure: eur(200000) },
        },
    };

    const budgetItems = [
        {
            id: 1,
            title: "Diseño gráfico",
            description: "Maquetación del libro",
            type: "task",
            deadline: "minimum",
            money: eur(300000),
        },
        {
            id: 2,
            title: "Imprenta",
            description: "Primera tirada",
            type: "material",
            deadline: "minimum",
            money: eur(200000),
        },
        {
            id: 3,
            title: "Web del proyecto",
            description: "Hosting por un año",
            type: "infrastructure",
            deadline: "optimum",
            money: eur(200000),
        },
    ];

    /** The budget items endpoint, answering with `items` */
    const budgetItemsHandler = (items) => [
        http.get("*/v4/project_budget_items", () => HttpResponse.json(items)),
    ];

    const { Story } = defineMeta({
        component: ProjectBudget,
        title: "Project/ProjectBudget",
        tags: ["autodocs"],
        args: { lang: "es", project, accounting: { balance: eur(250000) } },
        parameters: { msw: { handlers: budgetItemsHandler(budgetItems) } },
    });
</script>

<Story
    name="With items"
    play={async ({ canvas }) => {
        await expect(await canvas.findByText("Diseño gráfico")).toBeVisible();
        await expect(canvas.getByText("Web del proyecto")).toBeVisible();
    }}
/>

<Story
    name="No items"
    parameters={{ msw: { handlers: budgetItemsHandler([]) } }}
    play={async ({ canvas }) => {
        await expect(
            await canvas.findAllByText(es.pages.project.view.tabs.budget.empty),
        ).toHaveLength(2);
    }}
/>

<Story
    name="Loading"
    parameters={{
        msw: {
            handlers: [http.get("*/v4/project_budget_items", () => delay("infinite"))],
        },
    }}
/>
