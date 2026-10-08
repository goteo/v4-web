<script lang="ts">
    import { actions } from "astro:actions";

    import ChatMessage from "./ChatMessage.svelte";
    import ChatTextarea from "./ChatTextarea.svelte";
    import ReviewOptionsModal from "./ReviewOptionsModal.svelte";
    import RiskChangeCard from "./RiskChangeCard.svelte";
    // Aliased: the component already takes a `locale` prop, so the store needs another name.
    import { locale as currentLocale, t } from "../../i18n/store";
    import { formatDate } from "../../utils/dates";
    import {
        isSameAuthor,
        dayOf,
        opensNewDay,
        REVIEW_RISKS,
        RISK_TAG_VARIANTS,
    } from "../../utils/review";
    import BackButton from "../library/buttons/BackButton.svelte";
    import Button from "../library/buttons/Button.svelte";
    import Toast from "../library/feedback/Toast.svelte";
    import Tag from "../library/tags/Tag.svelte";
    import Title from "../library/typography/Title.svelte";

    import type {
        ProjectReviewRisk,
        ReviewArea,
        ReviewAuthor,
        ReviewComment,
    } from "../../types/projectReview";

    let {
        reviewId,
        area,
        authors = [],
        currentUserIri,
        projectTitle = "",
        canEditRisk = false,
        locale = "es",
    }: {
        /** Identifier of the review the area belongs to, used to build the back link. */
        reviewId: number;
        /** The reviewed area whose conversation is on screen. */
        area: ReviewArea;
        /** Profiles of everyone taking part in the conversation, keyed by their IRI. */
        authors?: ReviewAuthor[];
        /** IRI of the signed in user, which decides which bubbles are their own. */
        currentUserIri: string;
        /** Already translated on the server, since `$t` always resolves to Spanish. */
        projectTitle?: string;
        /** Only the consultant admin assesses risks; a promoter only reads them. */
        canEditRisk?: boolean;
        locale?: string;
    } = $props();

    /**
     * Entries this session added to the conversation: messages sent, and the cards a
     * risk change published. Appended to the ones the server rendered, because the
     * page was rendered before they existed.
     */
    let addedComments = $state<ReviewComment[]>([]);

    let comments = $derived([...area.comments, ...addedComments]);

    let draft = $state("");
    let sending = $state(false);

    let savingRisk = $state(false);
    let isRiskModalOpen = $state(false);

    /** Only set once the consultant picks a risk, so the tag moves with the modal. */
    let chosenRisk = $state<ProjectReviewRisk | undefined>(undefined);

    let errorMessage = $state("");
    let showError = $state(false);

    let conversation = $state<HTMLDivElement | undefined>(undefined);

    let authorByIri = $derived(new Map(authors.map((author) => [author.author, author])));

    let currentRisk = $derived(chosenRisk ?? area.risk);

    let tagVariant = $derived(currentRisk ? RISK_TAG_VARIANTS[currentRisk] : "success");

    let riskOptions = $derived(
        REVIEW_RISKS.map((risk) => ({ value: risk, label: $t(`domain.review.risks.${risk}`) })),
    );

    function authorOf(iri: string): ReviewAuthor | undefined {
        return authorByIri.get(iri);
    }

    /**
     * How a day separator reads: the days still close are named the way a chat names
     * them, and anything older is spelled out.
     */
    function dayLabel(comment: ReviewComment): string {
        const date = new Date(comment.dateCreated);
        const now = new Date();
        const day = dayOf(date);

        if (day === dayOf(now)) return $t("pages.review.chat.today");

        // Built from the calendar rather than by subtracting 24h, which slips a day on DST.
        const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

        if (day === dayOf(yesterday)) return $t("pages.review.chat.yesterday");

        return $t("pages.review.chat.day", { date: formatDate(date, $currentLocale) });
    }

    function fail(message: string) {
        errorMessage = message;
        showError = true;
    }

    /**
     * Assesses the risk of this area through the same action the areas screen uses, so
     * the consultant-only rule is enforced on the server for both screens.
     */
    async function handleRiskChange(risk: ProjectReviewRisk) {
        const previous = currentRisk;

        chosenRisk = risk;
        savingRisk = true;

        const { data, error } = await actions.updateReviewAreaRisk({
            reviewId,
            areaId: area.id,
            risk,
        });

        savingRisk = false;

        if (error) {
            chosenRisk = previous ?? undefined;
            fail(error.message);

            return;
        }

        // The card announcing the change was published on the server; showing it here
        // keeps the conversation in step without a reload.
        if (data?.entry) {
            addedComments.push(data.entry);
        }
    }

    async function send() {
        const body = draft.trim();

        if (!body || sending) return;

        sending = true;

        const { data, error } = await actions.sendReviewAreaComment({
            reviewId,
            areaId: area.id,
            body,
        });

        sending = false;

        if (error) {
            fail(error.message);

            return;
        }

        if (data?.comment) {
            addedComments.push(data.comment);
            draft = "";
        }
    }

    // Keep the newest message in view, both on arrival and while sending.
    $effect(() => {
        comments.length;

        if (conversation) {
            conversation.scrollTop = conversation.scrollHeight;
        }
    });
</script>

<div class="wrapper flex max-h-[calc(100dvh_-_var(--sticky-top))] flex-col gap-6">
    <Toast variant="error" bind:showToast={showError}>{errorMessage}</Toast>
    <div class="flex shrink-0 flex-col gap-4">
        <BackButton href={`/${locale}/reviews/${reviewId}`}>
            {$t("pages.review.btns.back")}
        </BackButton>

        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div class="flex items-center gap-4">
                <Title level={1} variant="headline" weight="bold">
                    {area.title}
                </Title>
                {#if currentRisk}
                    <Tag variant={tagVariant}>{$t(`domain.review.risks.${currentRisk}`)}</Tag>
                {/if}
            </div>
            {#if canEditRisk}
                <Button
                    kind="secondary"
                    class="w-fit"
                    disabled={savingRisk}
                    onclick={() => (isRiskModalOpen = true)}
                >
                    {$t("pages.review.btns.changeRisk")}
                </Button>
                <ReviewOptionsModal
                    bind:open={isRiskModalOpen}
                    title={$t("pages.review.btns.changeRisk")}
                    options={riskOptions}
                    value={currentRisk ?? ""}
                    onSelect={(risk) => handleRiskChange(risk as ProjectReviewRisk)}
                />
            {/if}
        </div>
    </div>

    <div
        bind:this={conversation}
        class="border-variant1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-2xl border bg-white p-6"
    >
        {#if comments.length}
            {#each comments as comment, index (comment.id)}
                {#if opensNewDay(comments[index - 1], comment)}
                    <div class="flex justify-center py-1">
                        <Tag variant="bold" class="bg-grey border-purple-soft font-normal">
                            {dayLabel(comment)}
                        </Tag>
                    </div>
                {/if}
                {@const author = authorOf(comment.author)}
                {#if comment.system}
                    <RiskChangeCard from={comment.system.from} to={comment.system.to} />
                {:else}
                    <ChatMessage
                        type={isSameAuthor(comment.author, currentUserIri) ? "own" : "foreign"}
                        name={author?.displayName ?? ""}
                        photo={author?.avatar}
                        message={comment.body}
                        date={new Date(comment.dateCreated)}
                    />
                {/if}
            {/each}
        {:else}
            <p class="text-content text-base">
                {$t("pages.review.chat.empty")}
            </p>
        {/if}
    </div>

    <ChatTextarea class="mb-10 shrink-0" bind:value={draft} disabled={sending} onSend={send} />
</div>
