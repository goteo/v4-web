<script lang="ts">
    import { actions } from "astro:actions";

    import ReviewOptionsModal from "./ReviewOptionsModal.svelte";
    import ReviewStateTag from "./ReviewStateTag.svelte";
    import RisksCard from "./RisksCard.svelte";
    import { t } from "../../i18n/store";
    import {
        CAMPAIGN_REVIEW_DECISIONS,
        CAMPAIGN_REVIEW_DECISION_STATUSES,
        CAMPAIGN_REVIEW_STATE_LABELS,
        PROMOTER_CHANGES_DONE_STATUS,
    } from "../../utils/review";
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
        isPromoter = false,
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
        /** The signed in user is the promoter of the project, not its consultant. */
        isPromoter?: boolean;
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
    let showSuccess = $state(false);

    let savingAreaId = $state<number | null>(null);
    let savingStatus = $state(false);
    let isStatusModalOpen = $state(false);

    /** Only set once a decision is applied; until then the project decides. */
    let chosenStatus = $state<ProjectReviewStatus | undefined>(undefined);

    let shownStatus = $derived(chosenStatus ?? projectStatus);

    /**
     * A consultant picks one of the three outcomes of the review; a promoter only
     * has one thing to say, that the requested changes are done, which is a button
     * of its own.
     */
    let statusOptions = $derived(
        CAMPAIGN_REVIEW_DECISIONS.map((decision) => ({
            value: CAMPAIGN_REVIEW_DECISION_STATUSES[decision],
            label: $t(CAMPAIGN_REVIEW_STATE_LABELS[decision]),
        })),
    );

    /** The promoter may only report their changes back while they were requested. */
    let promoterCanAct = $derived(
        isPromoter && canChangeStatus && shownStatus === "in_campaign_review.to_change",
    );

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
            return;
        }

        showSuccess = true;
    }

    /**
     * A promoter announcing that the requested changes are done has nothing to
     * decide, so the move is immediate instead of opening the status modal.
     */
    async function markChangesDone() {
        savingStatus = true;

        const { error } = await actions.updateReviewProjectStatus({
            reviewId,
            status: PROMOTER_CHANGES_DONE_STATUS,
        });

        savingStatus = false;

        if (error) {
            fail(error.message);
            return;
        }

        chosenStatus = PROMOTER_CHANGES_DONE_STATUS;
        showSuccess = true;
    }
</script>

<div class="flex w-full flex-col gap-10 pb-10">
    <Toast variant="error" bind:showToast={showError}>{errorMessage}</Toast>
    <Toast variant="success" bind:showToast={showSuccess}>
        {$t("pages.review.status.updated")}
    </Toast>
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
            <div class="flex flex-wrap items-center gap-3 self-start">
                <ReviewStateTag status={shownStatus} />
                {#if promoterCanAct}
                    <Button
                        kind="primary"
                        size="sm"
                        disabled={savingStatus}
                        onclick={markChangesDone}
                    >
                        {$t("pages.review.btns.changesDone")}
                    </Button>
                {:else if canChangeStatus && !isPromoter}
                    <Button
                        kind="primary"
                        size="sm"
                        disabled={savingStatus}
                        onclick={() => (isStatusModalOpen = true)}
                    >
                        {$t("pages.review.btns.decide")}
                    </Button>
                    <ReviewOptionsModal
                        bind:open={isStatusModalOpen}
                        title={$t("pages.review.btns.decide")}
                        options={statusOptions}
                        value={chosenStatus ?? ""}
                        onSelect={handleStatusChange}
                    />
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
