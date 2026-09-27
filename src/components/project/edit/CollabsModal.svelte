<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import { t } from "../../../i18n/store";
    import { client } from "../../../openapi/client/client.gen";
    import { apiProjectsIdOrSlugGetUrl } from "../../../openapi/client/operation-paths.gen";
    import { zApiProjectCollaborationsPostBody } from "../../../openapi/client/zod.gen";
    import { zCreateCollabForm, zUpdateCollabForm } from "../../../validation/collabValidation";
    import Button from "../../library/buttons/Button.svelte";
    import DeleteModal from "../../library/feedback/DeleteModal.svelte";
    import RichTextEditor from "../../library/inputs/RichTextEditor.svelte";
    import TextInput from "../../library/inputs/TextInput.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { ProjectCollaboration } from "../../../openapi/client";
    import type { ProjectDraftStore } from "../../../stores/drafts/draftsStore";

    let {
        open = $bindable(false),
        draft,
        collab,
        onSave,
        onDelete,
    }: {
        open: boolean;
        draft: ProjectDraftStore;
        collab?: ProjectCollaboration;
        onSave?: (collab: ProjectCollaboration) => void;
        onDelete?: (collab: ProjectCollaboration) => void;
    } = $props();

    let data: ProjectCollaboration = $derived.by(() => {
        if (collab) {
            return { ...collab };
        }

        return {
            project: client.buildUrl({
                url: apiProjectsIdOrSlugGetUrl,
                path: { idOrSlug: $draft.actual.id },
            }),
            title: "",
            description: "",
            isFulfilled: false,
        };
    });

    let validation: Partial<Record<keyof typeof data, string>> = $state({});

    const descriptionError = $derived(getValidationMessage("description"));

    function getValidationMessage(field: keyof typeof data): string {
        if (!validation[field]) {
            return "";
        }

        return $t(validation[field]);
    }

    function handleTitle(newTitle: string) {
        const result = zApiProjectCollaborationsPostBody.shape.title.safeParse(newTitle);

        if (result.success) {
            validation["title"] = "";
            return;
        }
        validation["title"] = result.error.issues[0].message;
    }

    function handleDescription(newDescription: string) {
        data.description = newDescription;

        const result =
            zApiProjectCollaborationsPostBody.shape.description.safeParse(newDescription);

        if (result.success) {
            validation["description"] = "";
            return;
        }

        validation["description"] = result.error.issues[0].message;
    }

    function handleSubmit(event: SubmitEvent) {
        event.preventDefault();

        const collabValidation = collab ? zUpdateCollabForm : zCreateCollabForm;
        const result = collabValidation.safeParse(data);

        if (result.success) {
            onSave?.(data);
            return;
        }

        for (const issue of result.error.issues) {
            validation[issue.path[0] as keyof typeof data] = issue.message;
        }
    }

    let openDeleteModal = $state(false);

    function handleDeleteClick() {
        if (collab) {
            onDelete?.(collab);
            openDeleteModal = false;
            open = false;
        }
    }
</script>

<Modal
    bind:open
    closeBtnClass="top-7 end-7 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex w-full max-w-225 -translate-x-1/2 -translate-y-1/2 divide-y-0 bg-transparent backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    bodyClass="p-0"
>
    <form class="flex flex-col gap-8 rounded-3xl bg-white p-6 shadow-lg" onsubmit={handleSubmit}>
        <Title level={2} variant="subsection">
            {$t("pages.project.edit.collaborations.modal.title")}
        </Title>
        <p class="text-content line-clamp-1 overflow-hidden text-base font-normal text-ellipsis">
            {$t("pages.project.edit.collaborations.modal.description")}
        </p>
        <div class="flex flex-col gap-10 pt-2">
            <TextInput
                bind:value={data.title}
                labelText={$t("pages.project.edit.collaborations.modal.form.titleLabel")}
                helperText={$t("pages.project.edit.collaborations.modal.form.titleHelper")}
                placeholder={$t("pages.project.edit.collaborations.modal.form.titlePlaceholder")}
                error={getValidationMessage("title")}
                onInput={(title) => handleTitle(String(title))}
            />
            <div class="flex flex-col gap-1">
                <RichTextEditor
                    id="description"
                    format="markdown"
                    value={data.description}
                    onChange={handleDescription}
                    placeholder={$t(
                        "pages.project.edit.collaborations.modal.form.descriptionPlaceholder",
                    )}
                    labelText={$t("pages.project.edit.collaborations.modal.form.descriptionLabel")}
                    error={descriptionError}
                    ariaDescribedBy="description-helper"
                />
                <p class="text-content ml-4 text-xs" id="description-helper">
                    {$t("pages.project.edit.collaborations.modal.form.descriptionHelper")}
                </p>
            </div>
        </div>
        <div class="flex items-center justify-end gap-4">
            {#if collab && onDelete}
                <Button kind="secondary" onclick={() => (openDeleteModal = true)} class="w-fit">
                    {$t("common.remove")}
                </Button>
                <DeleteModal
                    title={$t("pages.project.edit.collaborations.deleteModal.title")}
                    description={$t("pages.project.edit.collaborations.deleteModal.description")}
                    bind:open={openDeleteModal}
                    onclick={() => handleDeleteClick()}
                />
            {/if}
            <Button type="submit" class="w-fit">
                {$t("common.save")}
            </Button>
        </div>
    </form>
</Modal>
