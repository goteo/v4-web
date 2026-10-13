<script lang="ts">
    import ReviewOptionsModal from "./ReviewOptionsModal.svelte";
    import { locale, t } from "../../i18n/store";
    import { formatDate } from "../../utils/dates";
    import { lastActivity, REVIEW_RISKS, RISK_TAG_VARIANTS } from "../../utils/review";
    import Button from "../library/buttons/Button.svelte";
    import Tag from "../library/tags/Tag.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { ProjectReviewRisk, ReviewArea } from "../../types/projectReview";

    let {
        area,
        reviewId,
        locale: localePrefix = "es",
        canEditRisk = false,
        savingRisk = false,
        onRiskChange,
    }: {
        /** The reviewable area this card summarises. */
        area: ReviewArea;
        /** Identifier of the review the area belongs to, used to build the chat link. */
        reviewId: number;
        /** Active locale, needed to prefix the link because the site is routed by locale. */
        locale?: string;
        /** Only the consultant admin assesses risks; a promoter only reads them. */
        canEditRisk?: boolean;
        savingRisk?: boolean;
        onRiskChange?: (area: ReviewArea, risk: ProjectReviewRisk) => void;
    } = $props();

    let tagVariant = $derived(area.risk ? RISK_TAG_VARIANTS[area.risk] : "success");

    let isRiskModalOpen = $state(false);

    let riskOptions = $derived(
        REVIEW_RISKS.map((risk) => ({ value: risk, label: $t(`domain.review.risks.${risk}`) })),
    );

    let activity = $derived.by(() => {
        const latest = lastActivity(area.comments);

        if (!latest) return undefined;

        return $t("pages.review.card.activity", {
            count: area.comments.length,
            date: formatDate(latest, $locale),
        });
    });
</script>

<article
    class="border-variant1 bg-purple-soft flex w-full max-w-109.25 flex-col gap-8 rounded-2xl border p-6 transition-shadow duration-300 hover:shadow-sm"
>
    <div class="flex flex-col gap-4">
        <div class="flex justify-between">
            <div class="flex flex-col gap-1">
                <Title level={2} variant="subsection" color="secondary">
                    {area.title}
                </Title>
                {#if activity}
                    <span class="text-content text-sm/4">{activity}</span>
                {/if}
            </div>
            {#if area.risk}
                <Tag variant={tagVariant}>{$t(`domain.review.risks.${area.risk}`)}</Tag>
            {/if}
        </div>
        <p class="text-content line-clamp-4 w-full text-base">
            {area.summary}
        </p>
    </div>
    <div class="flex items-end gap-4">
        <Button class="flex-1" kind="ghost" href="/{localePrefix}/reviews/{reviewId}/{area.id}">
            {$t("pages.review.btns.seeChat")}
        </Button>
        {#if canEditRisk}
            <Button
                kind="secondary"
                class="flex-1"
                disabled={savingRisk}
                onclick={() => (isRiskModalOpen = true)}
            >
                {$t("pages.review.btns.changeRisk")}
            </Button>
            <ReviewOptionsModal
                bind:open={isRiskModalOpen}
                title={$t("pages.review.btns.changeRisk")}
                options={riskOptions}
                value={area.risk ?? ""}
                onSelect={(risk) => onRiskChange?.(area, risk as ProjectReviewRisk)}
            />
        {/if}
    </div>
</article>
