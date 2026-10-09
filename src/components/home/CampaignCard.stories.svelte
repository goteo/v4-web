<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import CampaignCard from "./CampaignCard.svelte";

    const eur = (amount) => ({ amount, currency: "EUR" });
    const inDays = (days) => new Date(Date.now() + days * 86400000).toISOString();

    const campaign = {
        id: 1,
        slug: "somos-la-resistencia",
        title: "Somos la resistencia: hagamos crecer el CE Europa",
        image: "/images/project/placeholder-project-update.jpg",
        status: "in_campaign",
        calendar: { release: inDays(-29), minimum: inDays(11), optimum: inDays(51) },
        minimum: eur(152000),
        optimum: eur(80052000),
        obtained: eur(60000),
    };

    const { Story } = defineMeta({
        component: CampaignCard,
        title: "Library/CampaignCard",
        tags: ["autodocs"],
        args: { size: "small", campaign, class: "max-w-[437px]" },
    });
</script>

<Story name="Towards minimum" />

<Story
    name="Matchfunding"
    args={{ campaign: { ...campaign, matchCallSubmissions: ["/v4/match_call_submissions/1"] } }}
/>

<Story name="Towards optimum" args={{ campaign: { ...campaign, obtained: eur(40000000) } }} />

<Story
    name="Finished"
    args={{
        campaign: {
            ...campaign,
            status: "funding.paid",
            obtained: eur(99999900),
            matchCallSubmissions: ["/v4/match_call_submissions/1"],
        },
    }}
/>

<Story name="Large" args={{ size: "large", class: "max-w-[899px]" }} />
