import { startOfDay } from "./dates";
import { extractId } from "./extractId";

import type { ProjectReviewRisk, ProjectReviewStatus, ReviewComment } from "../types/projectReview";

/**
 * Whether two references point at the same User.
 *
 * IRIs arrive both absolute and relative depending on who wrote them — the API builds
 * them from its collection URL, the placeholders spell them out — so they are compared
 * by id instead of as strings.
 * @param first One User IRI
 * @param second Another User IRI
 * @returns True when both references resolve to the same id
 */
export function isSameAuthor(first: string, second: string): boolean {
    return first === second || extractId(first) === extractId(second);
}

/** Every risk a reviewable area can be assessed with, from least to most severe. */
export const REVIEW_RISKS: ProjectReviewRisk[] = ["low", "medium", "high"];

/** Tag variant each risk level is painted with, matching `domain.review.risks.*`. */
export const RISK_TAG_VARIANTS: Record<ProjectReviewRisk, "success" | "warning" | "error"> = {
    low: "success",
    medium: "warning",
    high: "error",
};

/**
 * Translation key of each review status.
 *
 * The API writes the status of a review with a dot separator (`campaign_review.rejected`)
 * while the translations folder names it with an underscore, hence the explicit map.
 */
export const PROJECT_REVIEW_STATUS_LABELS: Record<ProjectReviewStatus, string> = {
    in_campaign_review: "domain.project.status.in_campaign_review",
    "in_campaign_review.to_change": "domain.project.status.in_campaign_review_to_change",
    "in_campaign_review.to_review": "domain.project.status.in_campaign_review_to_review",
    "campaign_review.rejected": "domain.project.status.campaign_review_rejected",
};

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
