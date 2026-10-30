<script lang="ts">
    import { t } from "../../i18n/store";
    import {
        CAMPAIGN_REVIEW_STATE_LABELS,
        CAMPAIGN_REVIEW_STATE_VARIANTS,
        campaignReviewState,
    } from "../../utils/review";
    import Tag from "../library/tags/Tag.svelte";

    let {
        status,
        class: classes = "",
    }: {
        /** Raw status of the reviewed project. */
        status?: string | null;
        class?: string;
    } = $props();

    let state = $derived(campaignReviewState(status));

    /**
     * A project can sit outside the campaign review — an old review whose project
     * already campaigns, for instance — and then it keeps its own status name.
     */
    let label = $derived(
        state
            ? $t(CAMPAIGN_REVIEW_STATE_LABELS[state])
            : status
              ? $t(`domain.project.status.${status.replaceAll(".", "_")}`)
              : "—",
    );
</script>

<Tag variant={state ? CAMPAIGN_REVIEW_STATE_VARIANTS[state] : "bold"} class={classes}>
    {label}
</Tag>
