<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import SdgIcon from "./SdgIcon.svelte";
    import { setLocale } from "../../i18n/store";

    const goals = Array.from({ length: 17 }, (_, i) => i + 1);

    const { Story } = defineMeta({
        component: SdgIcon,
        title: "Project/SdgIcon",
        tags: ["autodocs"],
        args: { goal: 4, locale: "es" },
        argTypes: {
            goal: { control: { type: "range", min: 1, max: 17 } },
            // Story-only, not a prop. Fixed per story: beforeEach only runs on mount.
            locale: { table: { disable: true } },
        },
        // The locale store is global: in Docs, an iframe per story keeps each one in its language.
        parameters: { docs: { story: { inline: false, iframeHeight: 560 } } },
        beforeEach: ({ args }) => {
            setLocale(args.locale);

            return () => setLocale("es");
        },
    });
</script>

{#snippet all()}
    <div class="grid w-fit grid-cols-3 gap-2 sm:grid-cols-6">
        {#each goals as goal (goal)}
            <SdgIcon {goal} class="size-40" />
        {/each}
    </div>
{/snippet}

<Story
    name="Default"
    args={{ class: "size-48" }}
    parameters={{ docs: { story: { iframeHeight: 260 } } }}
/>

<Story name="Español" args={{ locale: "es" }} template={all} />

<Story name="English" args={{ locale: "en" }} template={all} />

<Story name="Català" args={{ locale: "ca" }} template={all} />
