<script lang="ts">
    import { t } from "../../i18n/store";
    import { RISK_TAG_VARIANTS } from "../../utils/review";
    import Tag from "../library/tags/Tag.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { ProjectReviewRisk } from "../../types/projectReview";

    interface Props {
        /** Risk the area held before the change. */
        from: ProjectReviewRisk;
        /** Risk the area holds after the change, which the tag announces. */
        to: ProjectReviewRisk;
    }

    let { from, to }: Props = $props();
</script>

<div class="bg-secondary flex w-full flex-col gap-2 rounded-2xl p-6">
    <div class="flex items-center gap-3">
        <Title level={3} variant="subsection" color="white" weight="bold">
            {$t("pages.review.chat.riskChange.title")}
        </Title>
        <Tag variant={RISK_TAG_VARIANTS[to]}>{$t(`domain.review.risks.${to}`)}</Tag>
    </div>
    <p class="text-sm/6 text-purple-soft">
        {$t("pages.review.chat.riskChange.description", {
            from: $t(`domain.review.risks.${from}`).toLowerCase(),
            to: $t(`domain.review.risks.${to}`).toLowerCase(),
        })}
    </p>
</div>
