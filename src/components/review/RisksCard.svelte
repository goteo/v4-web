<script lang="ts">
    import { locale, t } from "../../i18n/store";
    import { formatDate } from "../../utils/dates";
    import Button from "../library/buttons/Button.svelte";
    import Tag from "../library/tags/Tag.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { ProjectReviewArea, ProjectReviewRisk } from "../../types/projectReview";

    let {
        review,
        risk,
        newMessage = false,
    }: {
        review: ProjectReviewArea;
        risk?: ProjectReviewRisk;
        newMessage?: boolean;
    } = $props();

    const riskStyles: Record<ProjectReviewRisk, "success" | "warning" | "error"> = {
        low: "success",
        medium: "warning",
        high: "error",
    };

    // An explicit `risk` prop overrides the one stored on the review.
    let currentRisk = $derived(risk ?? review.risk);
    let tagVariant = $derived(currentRisk ? riskStyles[currentRisk] : "success");

    let activity = $derived.by(() => {
        if (review.chatCount === undefined || !review.lastActivity) return undefined;

        return $t("pages.review.card.activity", {
            count: review.chatCount,
            date: formatDate(new Date(review.lastActivity), $locale),
        });
    });
</script>

<article
    class="border-variant1 bg-purple-soft flex w-full max-w-109.25 flex-col gap-8 rounded-2xl border p-6 {newMessage
        ? 'shadow-[0_1px_3px_0_#0000001A,0_6px_6px_0_#00000017,0_13px_8px_0_#0000000D,0_22px_9px_0_#00000003,0_35px_10px_0_#00000000]'
        : ''}"
>
    <div class="flex flex-col gap-4">
        <div class="flex justify-between">
            <div class="flex flex-col gap-1">
                <!-- TODO: Messages reactivity functionality (new messages styling and handling + future chatbox logic) -->
                <Title level={2} variant="subsection" color="secondary">
                    {review.title}
                </Title>
                {#if activity}
                    <span class="text-content text-sm/4">{activity}</span>
                {/if}
            </div>
            {#if currentRisk}
                <Tag variant={tagVariant}>{$t(`domain.review.risks.${currentRisk}`)}</Tag>
            {/if}
        </div>
        <p class="text-content line-clamp-4 w-full text-base">
            {review.summary}
        </p>
    </div>
    <div class="flex justify-between">
        <!-- TODO: Add functionality to both buttons -->
        <Button kind="ghost">
            {$t("pages.review.btns.seeChat")}
        </Button>
        <Button kind="secondary">
            {$t("pages.review.btns.changeRisk")}
        </Button>
    </div>
</article>
