<script lang="ts">
    import { actions } from "astro:actions";

    import ReviewOptionsModal from "./ReviewOptionsModal.svelte";
    import RisksCard from "./RisksCard.svelte";
    import { t } from "../../i18n/store";
    import { PROJECT_REVIEW_STATUS_LABELS } from "../../utils/review";
    import BackButton from "../library/buttons/BackButton.svelte";
    import Button from "../library/buttons/Button.svelte";
    import Toast from "../library/feedback/Toast.svelte";
    import Grid from "../library/layout/Grid.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { Project } from "../../openapi/client";
    import type {
        ProjectReviewRisk,
        ProjectReviewStatus,
        ReviewArea,
    } from "../../types/projectReview";

    let {
        reviewId,
        areas,
        title,
        subtitle = "",
        projectStatus = undefined,
        canAssessRisks = false,
        canChangeStatus = false,
        locale = "es",
    }: {
        /** Identifier of the review, used to build the chat links. */
        reviewId: number;
        /** The reviewable areas rendered as cards. */
        areas: ReviewArea[];
        /** Heading naming both sides of the review, already translated on the server. */
        title: string;
        /** Line under the title. Empty hides it, so a half-sentenced placeholder never shows. */
        subtitle?: string;
        /** Status the reviewed project is currently in. */
        projectStatus?: Project["status"];
        canAssessRisks?: boolean;
        canChangeStatus?: boolean;
        locale?: string;
    } = $props();

    /**
     * Copied rather than used in place: the consultant's risk changes are applied here
     * so the tag updates as soon as the action resolves, and a plain object received as
     * a prop carries no reactivity to mutate.
     */
    let reviewedAreas = $state<ReviewArea[]>(areas.map((area) => ({ ...area })));

    let errorMessage = $state("");
    let showError = $state(false);

    let savingAreaId = $state<number | null>(null);
    let savingStatus = $state(false);
    let isStatusModalOpen = $state(false);

    /** Only set once the consultant picks a status; until then the project decides. */
    let chosenStatus = $state<ProjectReviewStatus | undefined>(undefined);

    let selectedStatus = $derived(chosenStatus ?? asReviewStatus(projectStatus));

    let statusOptions = $derived.by(() => {
        const options = (Object.keys(PROJECT_REVIEW_STATUS_LABELS) as ProjectReviewStatus[]).map(
            (status) => ({ value: status, label: $t(PROJECT_REVIEW_STATUS_LABELS[status]) }),
        );

        // A project can sit in a status outside the review flow. Listing it keeps the
        // control honest instead of showing another status as the selected one.
        const current = asReviewStatus(projectStatus);

        if (current && !options.some((option) => option.value === current)) {
            return [{ value: current, label: $t(`domain.project.status.${current}`) }, ...options];
        }

        return options;
    });

    function asReviewStatus(status?: Project["status"]): ProjectReviewStatus | undefined {
        return status && status in PROJECT_REVIEW_STATUS_LABELS
            ? (status as ProjectReviewStatus)
            : undefined;
    }

    function fail(message: string) {
        errorMessage = message;
        showError = true;
    }

    async function handleRiskChange(area: ReviewArea, risk: ProjectReviewRisk) {
        const target = reviewedAreas.find((stored) => stored.id === area.id);

        if (!target) return;

        const previous = target.risk;

        target.risk = risk;
        savingAreaId = area.id;

        const { error } = await actions.updateReviewAreaRisk({
            reviewId,
            areaId: area.id,
            risk,
        });

        savingAreaId = null;

        if (error) {
            target.risk = previous;
            fail(error.message);
        }
    }

    async function handleStatusChange(status: string) {
        const previous = chosenStatus;
        const next = status as ProjectReviewStatus;

        chosenStatus = next;
        savingStatus = true;

        const { error } = await actions.updateReviewProjectStatus({ reviewId, status: next });

        savingStatus = false;

        if (error) {
            chosenStatus = previous;
            fail(error.message);
        }
    }
</script>

<div class="flex w-full flex-col gap-10 pb-10">
    <Toast variant="error" bind:showToast={showError}>{errorMessage}</Toast>
    <header class="space-y-6">
        <BackButton class="self-start" />
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div class="flex max-w-5xl flex-col gap-4">
                <Title level={1} variant="headline" weight="bold">
                    {title}
                </Title>
                {#if subtitle}
                    <p class="text-content text-base">{subtitle}</p>
                {/if}
            </div>
            <div class="self-start">
                {#if canChangeStatus}
                    <Button
                        kind="primary"
                        size="sm"
                        disabled={savingStatus}
                        onclick={() => (isStatusModalOpen = true)}
                    >
                        {$t("pages.review.btns.changeStatus")}
                    </Button>
                    <ReviewOptionsModal
                        bind:open={isStatusModalOpen}
                        title={$t("pages.review.btns.changeStatus")}
                        options={statusOptions}
                        value={selectedStatus ?? ""}
                        onSelect={handleStatusChange}
                    />
                {:else if projectStatus}
                    <span class="text-secondary text-sm font-bold">
                        {$t(`domain.project.status.${projectStatus}`)}
                    </span>
                {/if}
            </div>
        </div>
    </header>

    {#if reviewedAreas.length}
        <Grid class="grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {#each reviewedAreas as area (area.id)}
                <RisksCard
                    {area}
                    {reviewId}
                    {locale}
                    canEditRisk={canAssessRisks}
                    savingRisk={savingAreaId === area.id}
                    onRiskChange={handleRiskChange}
                />
            {/each}
        </Grid>
    {:else}
        <p class="text-content text-base">
            {$t("pages.review.areas.empty")}
        </p>
    {/if}
</div>
