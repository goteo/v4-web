<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import BudgetBar from "./BudgetBar.svelte";

    const eur = (amount) => ({ amount, currency: "EUR" });

    const project = {
        id: 1,
        budget: {
            minimum: {
                money: eur(500000),
                infra: eur(100000),
                material: eur(150000),
                task: eur(250000),
            },
            optimum: {
                money: eur(300000),
                infra: eur(0),
                material: eur(100000),
                task: eur(200000),
            },
        },
    };

    const { Story } = defineMeta({
        component: BudgetBar,
        title: "Project/BudgetBar",
        tags: ["autodocs"],
        args: { project, accounting: { balance: eur(200000) } },
    });
</script>

<Story name="No contributions" args={{ accounting: { balance: eur(0) } }} />

<Story name="Below minimum" />

<Story name="Minimum reached" args={{ accounting: { balance: eur(650000) } }} />

<Story name="Optimum exceeded" args={{ accounting: { balance: eur(1200000) } }} />

<Story name="Incomplete accounting" args={{ accounting: {} }} />

<Story name="No budget" args={{ project: { id: 1 } }} />
