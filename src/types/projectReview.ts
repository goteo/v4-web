/**
 * Risk level assessed on a review area.
 *
 * Values match the `domain.review.risks.*` translation keys.
 */
export type ProjectReviewRisk = "low" | "mid" | "high";

/** Stage of the project life-cycle a review belongs to. */
export type ProjectReviewType = "campaign" | "financial";

/**
 * Project statuses a consultant admin can move a project to from a review.
 *
 * `to_campaign_review` is deliberately left out: a review can only exist once the
 * project has left that state, so offering it would allow a project to be pushed
 * back to a step it already completed.
 */
export const PROJECT_REVIEW_STATUSES = [
    "in_campaign_review",
    "in_campaign_review.to_change",
    "in_campaign_review.to_review",
    "campaign_review.rejected",
] as const;

export type ProjectReviewStatus = (typeof PROJECT_REVIEW_STATUSES)[number];

/**
 * An entry the platform published in a conversation on its own, rather than a
 * message somebody wrote.
 *
 * It sits in the same list as the messages so it keeps its place in time, and
 * carries the detail the card is built from instead of a written body.
 */
export interface ReviewSystemEvent {
    /** Risk the area held before the change. */
    from: ProjectReviewRisk;
    /** Risk the area holds after the change, which the card announces. */
    to: ProjectReviewRisk;
}

/**
 * A message exchanged between the promoter and the consultant admin about one area.
 *
 * The API exposes `ProjectReviewComment`; this is the same resource once it has
 * been projected for the screens, widened with the optional `system` entry the
 * platform publishes itself when a risk changes (see {@link ReviewComment.system}).
 */
export interface ReviewComment {
    id: number;
    /** IRI of the User who wrote the message. */
    author: string;
    /** IRI of the ReviewArea this message belongs to. */
    area: string;
    /**
     * Message text. Stays empty on system entries, which read their card off
     * {@link ReviewComment.system} so the wording follows the active locale.
     */
    body: string;
    /** ISO 8601 date, provided by the API `DateCreatedTrait`. */
    dateCreated: string;
    /** ISO 8601 date, provided by the API `DateUpdatedTrait`. */
    dateUpdated: string;
    /** Set only on entries published by the platform; absent on messages. */
    system?: ReviewSystemEvent;
}

/**
 * A reviewable area of a project, that is, one of the risks the consultant
 * assesses. Each area carries its own conversation between promoter and admin.
 *
 * The API exposes `ProjectReviewArea`; this is the same resource once its
 * conversation has been embedded, which is how the review screens consume it.
 */
export interface ReviewArea {
    id: number;
    /** IRI of the ProjectReview this area belongs to. */
    review: string;
    /** Name of the reviewed area. */
    title: string;
    /** Reviewer's summary of the findings for this area. */
    summary: string;
    /** Risk assessed for this area, null while it has not been evaluated. */
    risk: ProjectReviewRisk | null;
    comments: ReviewComment[];
}

/**
 * A review of a project carried out by a consultant admin.
 *
 * The API exposes `ProjectReview` with its areas as a list of IRIs; this is the
 * same resource without that indirection, ready to hand the screens a review
 * whose conversations are already resolved.
 */
export interface ProjectReview {
    id: number;
    /** IRI of the reviewed Project. */
    project: string;
    /** IRI of the User acting as consultant. */
    reviewer: string;
    type: ProjectReviewType;
    areas: ReviewArea[];
}

/**
 * The subset of User data a chat bubble needs, resolved from an author IRI.
 */
export interface ReviewAuthor {
    /** IRI of the User resource. */
    author: string;
    handle: string;
    displayName: string;
    avatar?: string;
}
