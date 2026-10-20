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
    import { zProjectProjectUpdationDto } from "../../../openapi/client/zod.gen";
    import { validate } from "../../../utils/validation";
    import TranslationLanguages from "../../admin/TranslationLanguages.svelte";
    import EditIcon from "../../icons/actions/Edit.svelte";
    import Bullet from "../../icons/Bullet.svelte";
    import Eye from "../../icons/media/Eye.svelte";
    import ActionableButton from "../../library/buttons/ActionableButton.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import TabNavigation, { type Tab } from "../../library/layout/TabNavigation.svelte";

    import type { ProjectDraftStore } from "../../../stores/drafts/draftsStore";
    import type { Snippet } from "svelte";

    let {
        draft,
        step,
        children,
        onSave,
        onPublish,
        onStepChange,
        onLangChange,
    }: {
        draft: ProjectDraftStore;
        step: string;
        children: Snippet;
        onSave?: () => void;
        onPublish?: () => void;
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
    let previewOpen = $state(false);

    function handleTitleChange(title: string) {
        const [error] = validate(title, zProjectProjectUpdationDto.shape.title);

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

    async function handleSave() {
        const { data: project } = await apiProjectsIdPatch({
            baseUrl: "/api/relay",
            path: { id: String($draft.actual.id) },
            headers: { "Content-Language": $draft.lang },
            body: $draft.patch,
        });

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
                <TranslationLanguages
                    languages={$draft.languages}
                    selected={$draft.lang}
                    onAdd={(code) => draft.setLanguages([...$draft.languages, code])}
                    onRemove={(code) =>
                        draft.setLanguages($draft.languages.filter((other) => other !== code))}
                    onSelect={onLangChange}
                    removable={(code) => !$draft.actual.locales?.includes(code)}
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
                    onclick={() => {}}
                >
                    {$t("common.publish")}
                </Button>
            </div>
        </div>

        <!-- Header validation message -->
        <div class="h-4 px-6">
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

<ProjectPreviewModal bind:open={previewOpen} project={$draft.latest} />
