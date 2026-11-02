<script lang="ts">
    import TopReward from "./TopReward.svelte";
    import {
        apiProjectRewardsGetCollection,
        type Project,
        type ProjectReward,
    } from "../../openapi/client";
    import Loader from "../library/feedback/Loader.svelte";

    let {
        lang = $bindable(),
        project,
    }: {
        lang: string;
        project: Project;
    } = $props();

    let rewards: ProjectReward[] = $state([]);
    let isLoading = $state(true);

    $effect(() => {
        apiProjectRewardsGetCollection({
            query: { project: String(project.id), itemsPerPage: 3 },
            headers: { "Accept-Language": lang },
        })
            .then((data) => {
                rewards = data.data ?? [];
            })
            .finally(() => {
                isLoading = false;
            });
    });
</script>

{#if isLoading}
    <Loader />
{:else}
    <ul class="flex flex-col gap-6 lg:flex-row">
        {#each rewards as reward}
            <TopReward {reward} {project} />
        {/each}
    </ul>
{/if}
