<script lang="ts">
    import ThemeTag from "./ThemeTag.svelte";
    import TerritoryTag from "./TerritoryTag.svelte";

    import type { Project } from "../../openapi/client";

    export let project: Project;
</script>

<div class="flex w-auto gap-2">
    {#each project.themes as theme}
        <ThemeTag iri={theme} />
    {/each}
    <TerritoryTag territory={project.territory} iconSize="24" />
</div>
