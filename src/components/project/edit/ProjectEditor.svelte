<!--
    Provides the navigation shell for the multi-step project setup wizard.

    Features:
    - Step tabbed navigation
    - Visual progress indicators
    - Action buttons (Preview, Save, Publish)
    - Step validation before navigation
    - URL query parameter sync

    Design System:
    - Active tab: border-primary, text-secondary
    - Incomplete tab: border-purple-tint, text-tertiary
    - Disabled tab: border-light-muted, text-light-muted
-->
<script lang="ts">
    import ProjectPreviewModal from "./ProjectPreviewModal.svelte";
    import { t } from "../../../i18n/store";
    import { apiProjectsIdPatch } from "../../../openapi/client";
    import { zProjectProjectUpdationDtoJsonMergePatch } from "../../../openapi/client/zod.gen";
    import { PUBLISH_TRANSITIONS } from "../../../utils/projectStatus";
    import { validate, type ValidationError } from "../../../utils/validation";
    import LanguagesDropdown from "../../header/LanguagesDropdown.svelte";
    import EditIcon from "../../icons/actions/Edit.svelte";
    import Bullet from "../../icons/Bullet.svelte";
    import Eye from "../../icons/media/Eye.svelte";
    import ActionableButton from "../../library/buttons/ActionableButton.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import DeleteModal from "../../library/feedback/DeleteModal.svelte";
    import Toast from "../../library/feedback/Toast.svelte";
    import TabNavigation, { type Tab } from "../../library/layout/TabNavigation.svelte";

    import type { ProjectDraft } from "../../../repositories/drafts";
    import type { ProjectDraftStore } from "../../../stores/drafts/draftsStore";
    import type { Snippet } from "svelte";
    import type { z } from "zod";

    let {
        draft,
        step,
        children,
        onSave,
        onStepChange,
        onLangChange,
    }: {
        draft: ProjectDraftStore;
        step: string;
        children: Snippet;
        onSave?: () => void;
        onStepChange?: (step: string) => void;
        onLangChange?: (lang: string) => void;
    } = $props();

    // Define the six wizard steps (reactive to language changes)
    const steps = $derived<Tab[]>([
        { id: "1", label: $t("pages.project.edit.tabs.configuration") },
        { id: "2", label: $t("pages.project.edit.tabs.campaign") },
        { id: "3", label: $t("pages.project.edit.tabs.rewards") },
        { id: "4", label: $t("pages.project.edit.tabs.collaborations") },
        { id: "5", label: $t("pages.project.edit.tabs.budget") },
        { id: "6", label: $t("pages.project.edit.tabs.aboutYou") },
    ]);

    let errorMessage: string | undefined = $state();
    let saveError = $state("");
    let showSaveError = $state(false);
    let previewOpen = $state(false);
    let publishConfirmOpen = $state(false);

    let publishTransition = $derived(PUBLISH_TRANSITIONS[$draft.actual.status!]);

    function handleTitleChange(title: string) {
        const [error] = validate(title, zProjectProjectUpdationDtoJsonMergePatch.shape.title);

        if (!error) {
            draft.patch({ title });
            errorMessage = undefined;
            return;
        }

        switch (error.issue.code) {
            case "invalid_format":
                errorMessage = $t("pages.project.edit.validation.titleBadFormat", error.params);
                break;
            default:
                errorMessage = $t(error.message, error.params);
                break;
        }
    }

    function handleSubtitleChange(subtitle: string) {
        draft.patch({ subtitle });
    }

    /**
     * Checks the pending changes against the same constraints the API applies, so a
     * save that would be rejected with a 422 never leaves the editor. Title changes
     * are already validated on input; this also covers the rich-text descriptions
     * and the category selection.
     */
    function validatePatch(
        patch: ProjectDraft["patch"],
    ): { field: string; error: ValidationError } | undefined {
        const fields = zProjectProjectUpdationDto.shape;

        for (const [name, value] of Object.entries(patch)) {
            const schema = fields[name as keyof typeof fields];

            if (!schema || value === undefined) {
                continue;
            }

            const [error] = validate(value, schema as z.ZodType<unknown>);

            if (error) {
                return { field: name, error };
            }
        }

        return undefined;
    }

    async function handleSave() {
        const invalid = validatePatch($draft.patch);

        if (invalid) {
            saveError = $t(invalid.error.message, invalid.error.params);
            showSaveError = true;
            throw new Error(`Invalid project patch: ${invalid.field}`);
        }

        const { data: project, error } = await apiProjectsIdPatch({
            baseUrl: "/api/relay",
            path: { id: String($draft.actual.id) },
            headers: { "Content-Language": $draft.lang },
            body: $draft.patch,
        });

        // A failed save must keep the draft untouched: clearing the patch would
        // discard the local changes, and replacing `actual` with `undefined`
        // leaves the draft without owner or accounting, which breaks the preview.
        if (error || !project) {
            console.error("Failed to save the project:", error);
            saveError = $t("system.error.unknown");
            showSaveError = true;
            throw error ?? new Error("The project was not saved");
        }

        draft.update({ actual: project, patch: {} });
        errorMessage = undefined;
        showSaveError = false;
    }

    async function handlePublish() {
        if (!publishTransition) return;

        // Pending edits go out with the status change, so nothing unsaved is left behind.
        const { data: project, error } = await apiProjectsIdPatch({
            baseUrl: "/api/relay",
            path: { id: String($draft.actual.id) },
            headers: { "Content-Language": $draft.lang },
            body: { ...$draft.patch, status: publishTransition.to },
        });

        if (error || !project) {
            errorMessage = $t("pages.project.edit.header.publish.error");
            return;
        }

        errorMessage = undefined;
        draft.update({ actual: project, patch: {} });
    }
</script>

<div class="wrapper">
    <div class="p-10 pb-20">
        <!-- Header with title and action buttons -->
        <div
            class="bg-purple-soft border-variant1 mb-6 flex items-center justify-between gap-4 rounded-3xl border px-6 py-4 shadow-sm"
        >
            <!-- Left section: Icon + Title/Subtitle -->
            <div class="flex flex-1 items-center gap-4">
                <!-- Edit icon (rotated 180°) -->
                <div class="flex shrink-0 items-center justify-center">
                    <div class="rotate-180">
                        <EditIcon width="24" height="24" />
                    </div>
                </div>

                <!-- Title and subtitle column -->
                <div class="flex min-w-0 flex-1 flex-col justify-center">
                    <input
                        type="text"
                        value={$draft.latest.title}
                        oninput={(e) => handleTitleChange(e.currentTarget.value)}
                        placeholder={$t("pages.project.edit.header.titlePlaceholder")}
                        class="w-full border-0 bg-transparent pb-0 text-2xl leading-8 font-bold text-black focus:ring-0 focus:outline-none"
                    />
                    <input
                        type="text"
                        value={$draft.latest.subtitle}
                        oninput={(e) => handleSubtitleChange(e.currentTarget.value)}
                        placeholder={$t("system.loading")}
                        class="w-full border-0 bg-transparent pt-0 text-sm leading-6 font-normal text-black focus:ring-0 focus:outline-none"
                    />
                </div>
            </div>

            <!-- Right section: Action Buttons -->
            <div class="flex shrink-0 items-center gap-4">
                <LanguagesDropdown
                    languages={$draft.languages}
                    selected={$draft.lang}
                    onSelect={onLangChange}
                />
                <Button
                    class="whitespace-nowrap"
                    kind="ghost"
                    size="md"
                    onclick={() => (previewOpen = true)}
                >
                    <Eye class="size-5" />
                    {$t("common.preview")}
                </Button>
                <div class="relative">
                    <ActionableButton
                        kind="secondary"
                        size="md"
                        class="disabled:pointer-events-none"
                        action={handleSave}
                        autoreset={1000}
                        title={$draft.isDirty
                            ? $t("pages.project.edit.header.unsentChanges")
                            : $t("common.save")}
                    >
                        {$t("common.save")}
                        {#snippet actionedChildren()}
                            {$t("common.saved")}
                        {/snippet}
                    </ActionableButton>
                    {#if $draft.isDirty}
                        <Bullet class="absolute top-0 right-0" />
                    {/if}
                </div>
                <Button
                    class="disabled:pointer-events-none disabled:opacity-24"
                    kind="primary"
                    size="md"
                    disabled={!publishTransition}
                    onclick={() => {
                        if (publishTransition?.confirm) {
                            publishConfirmOpen = true;
                        } else {
                            handlePublish();
                        }
                    }}
                >
                    {$t("common.publish")}
                </Button>
            </div>
        </div>

        <!-- Header validation message -->
        <div class="min-h-4 px-6">
            <p class="text-semantic-error">
                {#if errorMessage}
                    {errorMessage}
                {/if}
            </p>
        </div>

        <!-- Tab Navigation -->
        <div class="mb-8">
            <TabNavigation tabs={steps} currentTab={step} onTabClick={(s) => onStepChange?.(s)} />
        </div>

        <!-- Step Content -->
        <div class="min-h-100">
            {@render children()}
        </div>
    </div>
</div>

<Toast floating variant="error" bind:showToast={showSaveError}>{saveError}</Toast>

<ProjectPreviewModal bind:open={previewOpen} project={$draft.latest} />

{#if publishTransition?.confirm}
    <DeleteModal
        bind:open={publishConfirmOpen}
        title={$t(`pages.project.edit.header.publish.${publishTransition.confirm}.title`)}
        description={$t(
            `pages.project.edit.header.publish.${publishTransition.confirm}.description`,
        )}
        confirmText={$t("common.publish")}
        onclick={async () => {
            await handlePublish();
            publishConfirmOpen = false;
        }}
    />
{/if}
