import { startOfDay } from "./dates";
import { extractId } from "./extractId";

import type { ProjectReviewRisk, ProjectReviewStatus, ReviewComment } from "../types/projectReview";

/**
 * Whether two references point at the same User.
 *
 * IRIs arrive both absolute and relative depending on who writes them, so they
 * are compared by id instead of as strings.
 * @param first One User IRI
 * @param second Another User IRI
 * @returns True when both references resolve to the same id
 */
export function isSameAuthor(first: string, second: string): boolean {
    return first === second || extractId(first) === extractId(second);
}

/** Every risk a reviewable area can be assessed with, from least to most severe. */
export const REVIEW_RISKS: ProjectReviewRisk[] = ["low", "mid", "high"];

/** Tag variant each risk level is painted with, matching `domain.review.risks.*`. */
export const RISK_TAG_VARIANTS: Record<ProjectReviewRisk, "success" | "warning" | "error"> = {
    low: "success",
    mid: "warning",
    high: "error",
};

/**
 * Background each risk level paints a square with.
 *
 * The colors match the tags of {@link RISK_TAG_VARIANTS}, so a status read as a
 * row of squares reads the same as the one on the review page.
 */
export const RISK_SQUARE_CLASSES: Record<ProjectReviewRisk, string> = {
    low: "bg-variant2",
    mid: "bg-variant4",
    high: "bg-tertiary",
};

/**
 * The five states a campaign review is shown as.
 *
 * The API moves a project through six raw statuses. Two of them mean the same to
 * the person deciding — the project is waiting for a review — so the screens
 * collapse them into one and expose five states in total.
 */
export const CAMPAIGN_REVIEW_STATES = [
    "pending",
    "changes_requested",
    "changes_done",
    "rejected",
    "approved",
] as const;

export type CampaignReviewState = (typeof CAMPAIGN_REVIEW_STATES)[number];

/** Translation key of each public review state. */
export const CAMPAIGN_REVIEW_STATE_LABELS: Record<CampaignReviewState, string> = {
    pending: "domain.review.state.pending",
    changes_requested: "domain.review.state.changesRequested",
    changes_done: "domain.review.state.changesDone",
    rejected: "domain.review.state.rejected",
    approved: "domain.review.state.approved",
};

/**
 * Tag variant each state is painted with.
 *
 * A pending review is the normal state of the queue, so it keeps the default
 * white tag; the rest stand out by how much they ask of the reader.
 */
export const CAMPAIGN_REVIEW_STATE_VARIANTS: Record<
    CampaignReviewState,
    "success" | "warning" | "error" | "bold" | undefined
> = {
    pending: undefined,
    changes_requested: "warning",
    changes_done: "bold",
    rejected: "error",
    approved: "success",
};

/**
 * Public state each raw campaign status is shown as.
 *
 * `to_campaign_review` belongs here even though the review flow cannot move a
 * project back into it: a project waiting for its first review is pending too.
 */
export const CAMPAIGN_REVIEW_STATE_BY_STATUS: Record<string, CampaignReviewState> = {
    to_campaign_review: "pending",
    in_campaign_review: "pending",
    "in_campaign_review.to_change": "changes_requested",
    "in_campaign_review.to_review": "changes_done",
    "campaign_review.rejected": "rejected",
    to_campaign: "approved",
};

/**
 * @param status A raw project status
 * @returns The public state it reads as, or undefined outside the campaign review
 */
export function campaignReviewState(status?: string | null): CampaignReviewState | undefined {
    return status ? CAMPAIGN_REVIEW_STATE_BY_STATUS[status] : undefined;
}

/**
 * Raw project statuses each public state covers, as the Project collection
 * filters by them.
 *
 * The reviews endpoint cannot filter by the status of the reviewed project, so
 * the table resolves a state into these statuses first.
 */
export const CAMPAIGN_REVIEW_STATE_STATUSES: Record<CampaignReviewState, string[]> = {
    pending: ["to_campaign_review", "in_campaign_review"],
    changes_requested: ["in_campaign_review.to_change"],
    changes_done: ["in_campaign_review.to_review"],
    rejected: ["campaign_review.rejected"],
    approved: ["to_campaign"],
};

/**
 * Expands public review states into the raw statuses the Project collection
 * filters by.
 *
 * Values the flow does not know are dropped instead of widening the query, so a
 * stale filter never brings unrelated projects in.
 * @param states Public states picked in the filter bar
 * @returns The raw statuses covering them, without duplicates
 */
export function expandCampaignReviewStates(states: string[]): string[] {
    return [
        ...new Set(
            states.flatMap(
                (state) => CAMPAIGN_REVIEW_STATE_STATUSES[state as CampaignReviewState] ?? [],
            ),
        ),
    ];
}

/**
 * The three outcomes a consultant decides a campaign review with.
 *
 * The other two public states are reached by the flow itself: the promoter sends
 * the changes back and the review keeps waiting, so offering them as choices
 * would let an admin fake a step that belongs to somebody else.
 */
export const CAMPAIGN_REVIEW_DECISIONS = ["changes_requested", "rejected", "approved"] as const;

export type CampaignReviewDecision = (typeof CAMPAIGN_REVIEW_DECISIONS)[number];

/** Raw project status written by each decision. */
export const CAMPAIGN_REVIEW_DECISION_STATUSES: Record<
    CampaignReviewDecision,
    ProjectReviewStatus
> = {
    changes_requested: "in_campaign_review.to_change",
    rejected: "campaign_review.rejected",
    approved: "to_campaign",
};

/**
 * @param status A raw project status
 * @returns The decision it is, if it is one
 */
export function campaignReviewDecision(status?: string | null): CampaignReviewDecision | undefined {
    return CAMPAIGN_REVIEW_DECISIONS.find(
        (decision) => CAMPAIGN_REVIEW_DECISION_STATUSES[decision] === status,
    );
}

/** Status a promoter moves the review to once the requested changes are done. */
export const PROMOTER_CHANGES_DONE_STATUS: ProjectReviewStatus = "in_campaign_review.to_review";

/**
 * The moment a conversation was last touched, used for the activity line of a card.
 * @param comments The messages of an area
 * @returns The date of the newest message, or null when the conversation is empty
 */
export function lastActivity(comments: ReviewComment[]): Date | null {
    if (!comments.length) return null;

    return new Date(
        comments.reduce(
            (latest, comment) => Math.max(latest, new Date(comment.dateCreated).getTime()),
            0,
        ),
    );
}

/** The calendar day a moment belongs to, as the value two dates are compared by. */
export function dayOf(date: Date): number {
    return startOfDay(date).getTime();
}

/**
 * Whether a message is the first one of a new day in the conversation.
 *
 * Chats break the thread with a date between days, so this marks where to place it.
 * @param previous The message right before this one, if any
 * @param current The message being rendered
 * @returns True when there is no previous message or both fall on different days
 */
export function opensNewDay(previous: ReviewComment | undefined, current: ReviewComment): boolean {
    if (!previous) return true;

    return dayOf(new Date(previous.dateCreated)) !== dayOf(new Date(current.dateCreated));
}
