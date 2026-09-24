<!--
    Campaign Information Step Component

    Second step of the project setup wizard.
    Handles:
    - Presentation media (images and video)
    - Campaign desc-brief (rich text)
    - Project desc-about (rich text)
    - Target audience (rich text)
    - Team information (rich text)

    Validation:
    - At least 1 image or 1 video required
    - All rich text fields have minimum character requirements
-->
<script lang="ts">
    import VideoUrlInput from "./VideoUrlInput.svelte";
    import { t } from "../../../i18n/store";
    import { formatFileSize } from "../../../utils/media/formatFileSize";
    import Check from "../../icons/actions/Check.svelte";
    import UploadIcon from "../../icons/actions/UploadIcon.svelte";
    import CloseIcon from "../../icons/navigation/Close.svelte";
    import ActionableButton from "../../library/buttons/ActionableButton.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import ImageUploadModal from "../../library/inputs/ImageUploadModal.svelte";
    import RichTextEditor from "../../library/inputs/RichTextEditor.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { ProjectDraftStore } from "../../../stores/drafts/draftsStore";
    import type { UploadedObject } from "../../../utils/media/objectStorage.types";

    interface CampaignInfoStepProps {
        draft: ProjectDraftStore;
        onContinue?: () => void;
    }

    let { draft, onContinue }: CampaignInfoStepProps = $props();

    let showUploadModal = $state(false);
    let coverSize = $state<number>();

    function handleContinue() {}

    function handleImageUpload(image: UploadedObject) {
        coverSize = image.size;
        draft.patch({ cover: image.url });
    }

    async function handleImageRemove(url: string): Promise<void> {
        const res = await fetch("/api/upload/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keyOrUrl: url }),
        });

        if (!res.ok) {
            throw new Error(`Failed to delete image from bucket: ${res.status}`);
        }

        draft.patch({ cover: undefined });
        coverSize = undefined;
    }

    function handleVideoChange(video?: string) {
        draft.patch({ video: video });
    }

    function handleBriefChange(doc: string) {
        draft.patch({ descBrief: doc });
    }

    function handleAboutChange(doc: string) {
        draft.patch({ descAbout: doc });
    }

    function handleGoalChange(doc: string) {
        draft.patch({ descGoal: doc });
    }

    function handleTeamChange(doc: string) {
        draft.patch({ descTeam: doc });
    }

    function handleCommunicationStrategyChange(doc: string) {
        // TO-DO: Add descStart to Project resource
        // draft.patch({ descStrat: doc });
    }
</script>

<div class="w-auto max-w-167 space-y-10">
    <!-- Page Header -->
    <div class="space-y-4">
        <Title level={1} variant="section">
            {$t("pages.project.edit.campaignInfo.title")}
        </Title>
        <p class="text-content text-base">{$t("pages.project.edit.campaignInfo.subtitle")}</p>
    </div>

    <div class="space-y-10">
        <!-- Media Section -->
        <section data-field="media" class="space-y-4">
            <div>
                <Title level={2} variant="subsection" class="mb-1">
                    {$t("pages.project.edit.campaignInfo.media.title")}
                    <span aria-label="required">*</span>
                </Title>
                <p class="text-content text-base">
                    {$t("pages.project.edit.campaignInfo.media.description")}
                </p>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Button
                    kind="secondary"
                    size="md"
                    onclick={() => (showUploadModal = true)}
                    class="h-fit"
                >
                    <UploadIcon />
                    {$t("pages.project.edit.campaignInfo.media.addImage")}
                </Button>

                <VideoUrlInput video={$draft.latest.video?.src} onChange={handleVideoChange} />
            </div>

            <ImageUploadModal
                bind:open={showUploadModal}
                onConfirm={(files) => files[0] && handleImageUpload(files[0])}
            />

            {#if $draft.latest.cover}
                {@const cover = $draft.latest.cover}
                <div class="grid grid-cols-1 gap-6 sm:grid-cols-2" role="list">
                    <div
                        class="group relative aspect-4/3 overflow-hidden rounded-lg"
                        role="listitem"
                    >
                        <img
                            src={cover}
                            alt={$draft.latest.title}
                            class="h-full w-full object-cover"
                        />

                        <ActionableButton
                            kind="invert"
                            size="sm"
                            title={$t("common.remove")}
                            action={() => handleImageRemove(cover)}
                            autoreset={1500}
                            class="bg-variant1/90 disabled:bg-variant1/90 hover:ring-secondary absolute top-2 right-2 z-10 size-8 rounded-full p-0 shadow-lg backdrop-blur-sm transition-all duration-200 hover:ring-1 hover:ring-offset-2 hover:outline-none"
                        >
                            <CloseIcon width="16" height="16" class="text-secondary" />
                            {#snippet actionedChildren()}
                                <Check width="16" height="16" />
                            {/snippet}
                        </ActionableButton>

                        <div
                            class="bg-variant1/90 text-secondary absolute right-0 bottom-0 left-0 px-2 py-1 text-xs"
                        >
                            {#if coverSize}
                                {formatFileSize(coverSize)}
                            {/if}
                        </div>
                    </div>
                </div>
            {/if}
        </section>

        <!-- Description: Brief Section -->
        <section data-field="desc-brief" class="space-y-4">
            <div>
                <label for="desc-brief" class="mb-1 block text-2xl font-bold text-black">
                    {$t("pages.project.edit.campaignInfo.goals.title")}
                    <span aria-label="required">*</span>
                </label>
                <p class="text-content text-base" id="desc-brief-help">
                    {$t("pages.project.edit.campaignInfo.goals.description")}
                </p>
            </div>

            <RichTextEditor
                id="desc-brief"
                format="markdown"
                value={$draft.latest.descBrief || ""}
                onChange={handleBriefChange}
                placeholder={$t("common.textPlaceholder")}
                ariaDescribedBy="desc-brief-help"
                minLength={20}
            />
        </section>

        <!-- Description: About Section -->
        <section data-field="desc-about" class="space-y-4">
            <div>
                <label for="about" class="mb-1 block text-2xl font-bold text-black">
                    {$t("pages.project.edit.campaignInfo.legacy.title")}
                    <span aria-label="required">*</span>
                </label>
                <p class="text-content text-base" id="desc-about-help">
                    {$t("pages.project.edit.campaignInfo.legacy.description")}
                </p>
            </div>

            <RichTextEditor
                id="about"
                format="markdown"
                value={$draft.latest.descAbout || ""}
                onChange={handleAboutChange}
                placeholder={$t("common.textPlaceholder")}
                ariaDescribedBy="desc-about-help"
                minLength={20}
            />
        </section>

        <!-- Description: Goal Section -->
        <section data-field="desc-goal" class="space-y-4">
            <div>
                <label for="desc-goal" class="mb-1 block text-2xl font-bold text-black">
                    {$t("pages.project.edit.campaignInfo.target.title")}
                    <span aria-label="required">*</span>
                </label>
                <p class="text-content text-base" id="desc-goal-help">
                    {$t("pages.project.edit.campaignInfo.target.description")}
                </p>
            </div>

            <RichTextEditor
                id="desc-goal"
                format="markdown"
                value={$draft.latest.descGoal || ""}
                onChange={handleGoalChange}
                placeholder={$t("common.textPlaceholder")}
                ariaDescribedBy="desc-goal-help"
                minLength={20}
            />
        </section>

        <!-- Description: Team Section -->
        <section data-field="desc-team" class="space-y-4">
            <div>
                <label for="desc-team" class="mb-1 block text-2xl font-bold text-black">
                    {$t("pages.project.edit.campaignInfo.team.title")}
                    <span aria-label="required">*</span>
                </label>
                <p class="text-content text-base" id="desc-team-help">
                    {$t("pages.project.edit.campaignInfo.team.description")}
                </p>
            </div>

            <RichTextEditor
                id="team"
                format="markdown"
                value={$draft.latest.descTeam || ""}
                onChange={handleTeamChange}
                placeholder={$t("common.textPlaceholder")}
                ariaDescribedBy="desc-team-help"
                minLength={20}
            />
        </section>

        <!-- TO-DO: Uncomment when the strategy field is added to project description -->
        <!-- Description: Strategy Section -->
        <!-- <section data-field="desc-strat" class="space-y-4">
            <div>
                <label
                    for="desc-strat"
                    class="mb-1 block text-2xl font-bold text-black"
                >
                    {$t("pages.project.edit.campaignInfo.communicationStrategy.title")}
                </label>
                <p class="text-content text-base" id="desc-strat-help">
                    {$t("pages.project.edit.campaignInfo.communicationStrategy.description")}
                </p>
            </div>

            <RichTextEditor
                id="desc-strat"
                value={markdownToRichText($draft.latest.descStrat || "")}
                onChange={handleCommunicationStrategyChange}
                placeholder={$t("common.textPlaceholder")}
                ariaDescribedBy="desc-strat-help"
                minLength={20}
            />
        </section> -->
    </div>

    <!-- Continue Button -->
    <div class="flex justify-start pt-4">
        <Button kind="secondary" size="md" onclick={handleContinue}>
            {$t("pages.project.edit.campaignInfo.continue")}
        </Button>
    </div>
</div>
