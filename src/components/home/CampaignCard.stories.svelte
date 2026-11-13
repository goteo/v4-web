<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import CampaignCard from "./CampaignCard.svelte";

    const eur = (amount) => ({ amount, currency: "EUR" });
    const inDays = (days) => new Date(Date.now() + days * 86400000).toISOString();
    // Solid-colour SVG of the given size, to try covers with extreme aspect ratios offline
    const cover = (width, height) =>
        `data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#7d4dbc"/><circle cx="50%" cy="50%" r="${Math.min(width, height) / 3}" fill="#fff"/></svg>`,
        )}`;

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
    name="Funded"
    args={{
        campaign: {
            ...campaign,
            status: "funding.paid",
            obtained: eur(99999900),
            matchCallSubmissions: ["/v4/match_call_submissions/1"],
        },
    }}
/>

<Story name="Archived" args={{ campaign: { ...campaign, status: "campaign.failed" } }} />

<Story
    name="Upcoming"
    args={{
        campaign: { ...campaign, status: "to_campaign", calendar: undefined, obtained: eur(0) },
    }}
/>

<Story name="Wide cover" args={{ campaign: { ...campaign, image: cover(4000, 200) } }} />

<Story name="Tall cover" args={{ campaign: { ...campaign, image: cover(200, 4000) } }} />

<Story name="Broken cover" args={{ campaign: { ...campaign, image: "" } }} />

<Story
    name="Crowded"
    args={{
        campaign: {
            ...campaign,
            title: "Supercalifragilisticoespialidosoproyectodeeconomiasocialysolidaria",
            matchCallSubmissions: ["/v4/match_call_submissions/1"],
            tags: ["Ecología", "Cultura", "Democracia", "Solidaria"],
        },
    }}
/>

<Story name="Large" args={{ size: "large", class: "max-w-[899px]" }} />
