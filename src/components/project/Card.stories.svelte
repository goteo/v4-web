<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import { expect } from "storybook/test";

    import Card from "./Card.svelte";
    import es from "../../i18n/locales/es.json";

    const eur = (amount) => ({ amount, currency: "EUR" });
    const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();

    const project = {
        id: 1,
        status: "in_campaign",
        deadline: "minimum",
        calendar: { minimum: daysAgo(-20), optimum: daysAgo(-60) },
        budget: { minimum: { money: eur(500000) }, optimum: { money: eur(800000) } },
    };

    /** Cumulative balance of the campaign, one point per week */
    const balancePoints = (...amounts) =>
        amounts.map((amount, week) => ({
            start: daysAgo((amounts.length - week) * 7),
            balance: eur(amount),
        }));

    const { campaign } = es.domain.project;

    const { Story } = defineMeta({
        component: Card,
        title: "Project/FundingCard",
        tags: ["autodocs"],
        args: {
            project,
            totalSupports: 12,
            accounting: { balance: eur(120000) },
            balancePoints: balancePoints(30000, 80000, 120000),
            onScrollToRewards: () => {},
        },
    });
</script>

<Story
    name="No contributions"
    args={{ totalSupports: 0, accounting: { balance: eur(0) }, balancePoints: [] }}
    play={async ({ canvas }) => {
        await expect(canvas.queryByText(campaign.minimumReached)).toBeNull();
        await expect(canvas.queryByText(campaign.optimumReached)).toBeNull();
    }}
/>

<Story
    name="Below minimum"
    play={async ({ canvas }) => {
        await expect(canvas.queryByText(campaign.minimumReached)).toBeNull();
    }}
/>

<Story
    name="Minimum reached"
    args={{
        accounting: { balance: eur(650000) },
        balancePoints: balancePoints(200000, 450000, 650000),
    }}
    play={async ({ canvas }) => {
        await expect(canvas.getByText(campaign.minimumReached)).toBeVisible();
    }}
/>

<Story
    name="Optimum exceeded"
    args={{
        accounting: { balance: eur(950000) },
        balancePoints: balancePoints(300000, 700000, 950000),
    }}
    play={async ({ canvas }) => {
        await expect(canvas.getByText(campaign.optimumReached)).toBeVisible();
        await expect(canvas.queryByText(campaign.minimumReached)).toBeNull();
    }}
/>

<Story
    name="Second round"
    args={{
        project: { ...project, deadline: "optimum", calendar: { minimum: daysAgo(10) } },
        accounting: { balance: eur(650000) },
        balancePoints: balancePoints(200000, 450000, 650000),
    }}
/>

<Story name="Incomplete accounting" args={{ accounting: {}, balancePoints: [] }} />

<Story
    name="Campaign closed"
    args={{ project: { ...project, status: "funded" } }}
    play={async ({ canvas }) => {
        await expect(canvas.getByRole("button", { name: campaign.donate })).toBeDisabled();
    }}
/>
