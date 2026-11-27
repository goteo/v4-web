<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import ProjectImpact from "./ProjectImpact.svelte";

    const { Story } = defineMeta({
        component: ProjectImpact,
        title: "Project/ProjectImpact",
        tags: ["autodocs"],
        args: { project: { sdgs: [4, 11, 13] } },
    });
</script>

<Story name="Three goals" />

<Story name="No goals (renders nothing)" args={{ project: { sdgs: [] } }} />
