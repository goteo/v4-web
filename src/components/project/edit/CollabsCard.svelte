<script lang="ts">
    import CollabsModal from "./CollabsModal.svelte";
    import { t } from "../../../i18n/store";
    import {
        apiProjectCollaborationsIdDelete,
        apiProjectCollaborationsIdPatch,
        type ProjectCollaboration,
    } from "../../../openapi/client";
    import { renderMarkdown } from "../../../utils/renderMarkdown";
    import Close from "../../icons/navigation/Close.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import DeleteModal from "../../library/feedback/DeleteModal.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { ProjectDraftStore } from "../../../stores/drafts/draftsStore";

    let {
        draft,
        collab,
        onSave,
        onDelete,
    }: {
        draft: ProjectDraftStore;
        collab: ProjectCollaboration;
        onSave?: (collab: ProjectCollaboration) => void;
        onDelete?: (collab: ProjectCollaboration) => void;
    } = $props();

    let openModal = $state(false);
    let openDeleteModal = $state(false);

    async function handleSave(newCollab: ProjectCollaboration) {
        const { error } = await apiProjectCollaborationsIdPatch({
            baseUrl: "/api/relay",
            headers: { "Content-Language": $draft.lang },
            path: { id: String(collab.id) },
            body: newCollab,
        });

        if (!error) {
            openModal = false;
            onSave?.(newCollab);
            return;
        }

        console.error(error);
    }

    async function handleDelete(collab: ProjectCollaboration) {
        const { error } = await apiProjectCollaborationsIdDelete({
            baseUrl: "/api/relay",
            path: { id: String(collab.id) },
        });

        if (!error) {
            openDeleteModal = false;
            openModal = false;
            onDelete?.(collab);
            return;
        }

        console.error(error);
    }
</script>

<div
    class="border-grey relative flex basis-1/3 flex-col justify-between gap-2 rounded-4xl border bg-white p-6 shadow-[0px_1px_3px_0px_#0000001A] md:gap-4"
>
    <button
        type="button"
        aria-label={$t("common.delete")}
        class="text-secondary absolute top-6 right-6 cursor-pointer transition-transform hover:scale-110"
        onclick={() => (openDeleteModal = true)}
    >
        <Close class="size-5" />
    </button>
    <div class="flex flex-col">
        <Title
            level={3}
            variant="subsection"
            color="secondary"
            truncate={2}
            class="w-full text-left"
        >
            {collab.title}
        </Title>

        {#if collab.description}
            <div class="marked-content line-clamp-7 text-sm whitespace-pre-line text-gray-800">
                {#await renderMarkdown(collab.description ?? "") then description}
                    {@html description}
                {/await}
            </div>
        {/if}
    </div>

    <Button kind="secondary" class="w-full" onclick={() => (openModal = true)}>
        {$t("common.edit")}
    </Button>

    <CollabsModal
        bind:open={openModal}
        {draft}
        {collab}
        onSave={handleSave}
        onDelete={handleDelete}
    />
    <DeleteModal
        title={$t("pages.project.edit.collaborations.deleteModal.title")}
        description={$t("pages.project.edit.collaborations.deleteModal.description")}
        bind:open={openDeleteModal}
        onclick={() => handleDelete(collab)}
    />
</div>
