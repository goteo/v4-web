<!--
    Configuration Step Component

    First step of the project setup wizard.
    Handles:
    - Categories (up to 2)
    - Campaign release date
    - Funding rounds (1 or 2)

    Validation:
    - Funding rounds defaults to 1
-->
<script lang="ts">
    import RoundSelector from "./RoundSelector.svelte";
    import SdgSelect from "./SdgSelect.svelte";
    import CategorySelect from "../../../components/library/inputs/CategorySelect.svelte";
    import DateInput from "../../../components/library/inputs/DateInput.svelte";
    import { locale, t } from "../../../i18n/store";
    import { withoutCache } from "../../../openapi/cacheInterceptor";
    import { apiCategoriesGetCollection } from "../../../openapi/client";
    import { client } from "../../../openapi/client/client.gen";
    import { apiCategoriesIdOrSlugGetUrl } from "../../../openapi/client/operation-paths.gen";
    import { extractId } from "../../../utils/extractId";
    import { toCollectionItems } from "../../../utils/hydra";
    import Button from "../../library/buttons/Button.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { Category, Project } from "../../../openapi/client";
    import type { ProjectDraft as ProjectDraftData } from "../../../repositories/drafts";
    import type { ProjectDraftStore } from "../../../stores/drafts/draftsStore";

    type ProjectDraftPatch = ProjectDraftData["patch"];

    interface ConfigurationStepProps {
        draft: ProjectDraftStore;
        onContinue?: () => void;
    }

    let { draft, onContinue }: ConfigurationStepProps = $props();

    /**
     * Handle Continue button
     * Simple navigation to next step (2) - validation happens on save/submit
     */
    function handleContinue() {
        // navigateToStep(2);
        if (onContinue) {
            onContinue();
        }
    }

    let allCategories = $derived.by(async () => {
        const { data } = await withoutCache(() =>
            apiCategoriesGetCollection({
                baseUrl: "/api/relay",
                headers: { "Accept-Language": $locale },
            }),
        );

        return toCollectionItems<Category>(data);
    });

    let categories = $derived($draft.latest.categories.map((c) => extractId(c)!));

    let categoriesError = $derived(
        categories.length === 0
            ? $t("pages.project.create.validation.categoriesNotEnough", { min: "1" })
            : undefined,
    );

    function handleCategoryChange(selected: Category[]) {
        draft.patch({
            categories: selected.map((s) => {
                return client.buildUrl({
                    url: apiCategoriesIdOrSlugGetUrl,
                    path: { idOrSlug: s.id },
                });
            }),
        });
    }

    // ponytail: v4-api has no SDG field yet. Until `pnpm sdk` brings `sdgs` (and its max), they
    // only live in the local draft: the PATCH carries them and the API ignores unknown fields.
    // Then drop these casts and read the max from the SDK schema.
    const MAX_SDGS = 3;

    let sdgs = $derived(($draft.latest as Project & { sdgs?: number[] }).sdgs ?? []);

    function handleSdgsChange(selected: number[]) {
        draft.patch({ sdgs: selected } as ProjectDraftPatch);
    }

    let release = $derived(new Date($draft.latest.calendar?.release || new Date()));

    const releaseDisabled = $derived.by(() => {
        return !["in_draft", "in_campaign_review.to_change"].includes($draft.latest.status!);
    });

    const releaseMinimum = $derived.by(() => {
        if (releaseDisabled) {
            return;
        }

        const dateMin = new Date();
        dateMin.setDate(dateMin.getDate() + 14);

        return dateMin;
    });

    /**
     * Handle release date change
     */
    function handleReleaseChange(date: Date) {
        draft.patch({ calendar: { release: date.toISOString() } });
    }

    let deadline = $derived($draft.latest.deadline || "minimum");

    /**
     * Handle funding rounds change
     */
    function handleRoundsChange(deadline: Project["deadline"]) {
        draft.patch({ deadline });
    }
</script>

<div class="space-y-8">
    <!-- Page Header -->
    <div class="space-y-4">
        <Title level={1} variant="headline">
            {$t("pages.project.edit.configuration.title")}
        </Title>
        <p class="text-content text-base font-normal">
            {$t("pages.project.edit.configuration.subtitle")}
        </p>
    </div>

    <!-- Categories Section -->
    {#await allCategories then options}
        {#if options.length > 0}
            <div class="space-y-4">
                <div class="space-y-4">
                    <Title level={2} variant="subsection">
                        {$t("pages.project.create.categories.title")}
                    </Title>
                    <p class="text-black transition-all duration-300 ease-in-out">
                        {$t("pages.project.create.categories.subtitle")}
                    </p>
                </div>
                <CategorySelect
                    max={2}
                    {options}
                    bind:selectedIds={categories}
                    onChange={handleCategoryChange}
                    error={categoriesError}
                />
            </div>
        {/if}
    {/await}

    <!-- SDGs Section -->
    <div class="space-y-4">
        <div class="space-y-4">
            <Title level={2} variant="subsection">
                {$t("pages.project.edit.configuration.sdgs.title")}
            </Title>
            <p class="text-content text-base font-normal">
                {$t("pages.project.edit.configuration.sdgs.subtitle", { max: MAX_SDGS })}
            </p>
        </div>
        <SdgSelect selected={sdgs} max={MAX_SDGS} onChange={handleSdgsChange} />
    </div>

    <!-- Release Date Section -->
    <div class="space-y-4">
        <div class="space-y-4">
            <Title level={2} variant="subsection">
                {$t("pages.project.edit.configuration.release.title")}
            </Title>
            <p class="text-content text-base font-normal">
                {#if releaseDisabled}
                    {$t("pages.project.edit.configuration.release.passed")}
                {:else}
                    {$t("pages.project.edit.configuration.release.subtitle")}
                {/if}
            </p>
        </div>
        <DateInput
            name="release"
            class="max-w-167"
            bind:value={release}
            min={releaseMinimum}
            disabled={releaseDisabled}
            onInput={handleReleaseChange}
        />
    </div>

    <!-- Funding Rounds Section -->
    <div class="space-y-6">
        <div class="space-y-4">
            <Title level={2} variant="subsection">
                {$t("pages.project.edit.configuration.rounds.title")}
            </Title>
            <p class="text-content text-base font-normal">
                {$t("pages.project.edit.configuration.rounds.description")}
            </p>
        </div>
        <RoundSelector bind:deadline onChange={handleRoundsChange} />
    </div>

    <!-- Continue Button -->
    <div class="mb- flex justify-start">
        <Button kind="secondary" size="md" onclick={handleContinue}>
            {$t("pages.project.edit.configuration.continue")}
        </Button>
    </div>
</div>
