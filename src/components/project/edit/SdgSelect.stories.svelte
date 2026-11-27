<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import SdgSelect from "./SdgSelect.svelte";

    const { Story } = defineMeta({
        component: SdgSelect,
        title: "Project/Edit/SdgSelect",
        tags: ["autodocs"],
        args: { selected: [4, 11], max: 3 },
    });
</script>

<Story name="Default">
    {#snippet template(args)}
        <SdgSelect {...args} onChange={(selected) => (args.selected = selected)} />
    {/snippet}
</Story>
