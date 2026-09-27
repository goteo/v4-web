<script lang="ts">
    import CollabsCard from "./CollabsCard.svelte";
    import CreateCard from "./CreateCard.svelte";
    import { t } from "../../../i18n/store";
    import { withoutCache } from "../../../openapi/cacheInterceptor";
    import { apiProjectCollaborationsGetCollection } from "../../../openapi/client";
    import Button from "../../library/buttons/Button.svelte";
    import Grid from "../../library/layout/Grid.svelte";
    import Title from "../../library/typography/Title.svelte";
    import LoadingSpinner from "../../search/LoadingSpinner.svelte";

    import type { ProjectDraftStore } from "../../../stores/drafts/draftsStore";

    let { draft }: { draft: ProjectDraftStore } = $props();

    let collabs = $state(loadCollabs());

    function loadCollabs() {
        return withoutCache(() =>
            apiProjectCollaborationsGetCollection({
                baseUrl: "/api/relay",
                headers: { "Accept-Language": $draft.lang },
                query: { project: String($draft.actual.id) },
            }).then(({ data, error }) => {
                if (error || !data) {
                    console.error(error);
                    return [];
                }

                return data;
            }),
        );
    }

    function reloadCollabs() {
        collabs = loadCollabs();
    }
</script>

<div class="w-full space-y-10">
    <div class="flex w-full flex-col gap-4">
        <Title level={2} variant="headline">
            {$t("pages.project.edit.collaborations.title")}
        </Title>
        <p class="text-content text-base font-normal">
            {$t("pages.project.edit.collaborations.subtitle")}
        </p>
    </div>
    <Grid>
        {#await collabs}
            <LoadingSpinner size="lg" class="col-span-3 mx-auto my-10" />
        {:then collabs}
            {#each collabs as collab, index}
                <CollabsCard {draft} {collab} onSave={reloadCollabs} onDelete={reloadCollabs} />
            {/each}
        {/await}
        <CreateCard
            {draft}
            variant="collab"
            title={$t("pages.project.edit.collaborations.add.title")}
            description={$t("pages.project.edit.collaborations.add.description")}
            onSave={reloadCollabs}
        />
    </Grid>

    <!-- Continue Button -->
    <div class="flex justify-start">
        <Button kind="secondary" size="md">
            {$t("pages.project.edit.collaborations.continue")}
        </Button>
    </div>
</div>
