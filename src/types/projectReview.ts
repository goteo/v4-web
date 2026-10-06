/**
 * Risk level assessed on a review area.
 *
 * Values match the `domain.review.risks.*` translation keys.
 */
export type ProjectReviewRisk = "low" | "medium" | "high";

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
 * NOTE: this is not part of the OpenAPI spec — the v4 API exposes no review
 * resources yet, so `src/openapi/client` has no generated equivalent. Replace this
 * interface with the generated type once the API ships those endpoints.
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
 * NOTE: this is not part of the OpenAPI spec — see {@link ReviewComment}.
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
 * NOTE: this is not part of the OpenAPI spec — see {@link ReviewComment}.
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
