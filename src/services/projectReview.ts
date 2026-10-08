import seed from "../mocks/projectReviews.json";

import type {
    ProjectReview,
    ProjectReviewRisk,
    ProjectReviewStatus,
    ReviewArea,
    ReviewAuthor,
    ReviewComment,
    ReviewSystemEvent,
} from "../types/projectReview";

/**
 * Minimal shape of an API failure, matching the `error` the generated client
 * resolves with so that callers handle both the same way.
 */
export interface ReviewError {
    status: number;
}

export interface ReviewResult<T> {
    data?: T;
    error?: ReviewError;
}

const NOT_FOUND: ReviewError = { status: 404 };

/** Identifier of the review the placeholders describe, for links built outside the feature. */
export const PLACEHOLDER_REVIEW_ID = 1;

/**
 * The reviewed project, as far as it is known before the API carries it.
 *
 * Only the placeholders fill this in; a real review resolves its project through
 * `getReviewedProject` instead.
 */
export interface ReviewProject {
    title: string;
    status: ProjectReviewStatus;
    /** IRI of the User promoting the project. */
    owner: string;
}

/**
 * TEMPORARY stand-in for the reviews API.
 *
 * The v4 API is still building the review feature, so this module serves the
 * placeholders in `src/mocks/projectReviews.json` behind the same `{ data, error }`
 * envelope the generated client returns. Every function here maps one-to-one onto
 * the endpoint it will eventually become, so landing the API means replacing the
 * bodies below with `apiReviews*` calls and deleting the mocks — nothing that
 * consumes this module has to change.
 *
 * Writes mutate an in-memory copy seeded from the JSON, so they last for the
 * lifetime of the isolate and are lost on a cold start. That is enough to exercise
 * the screens while the API is missing, and it keeps the storage concern in a
 * single file.
 *
 * The placeholders name `/v4/projects/1`, so point `project` at a project that
 * exists in the environment being used, and the author IRIs at the users that will
 * sign in, otherwise the review screens answer 404.
 */

let reviews: Map<string, ProjectReview> | undefined;

const seedReviews = seed.reviews as unknown as ProjectReview[];

const seedProjects = seed.projects as unknown as Record<string, ReviewProject>;

/**
 * The project behind a review, as far as the placeholders know it.
 *
 * Used to render the review screens for a project the API has no record of yet.
 * @param review The review being read
 * @returns The placeholder project, or undefined when the review has none
 */
export function getReviewProjectPlaceholder(review: ProjectReview): ReviewProject | undefined {
    return seedProjects[review.project];
}

/** Author profiles keyed by their User IRI, used to resolve chat bubbles. */
const authors = new Map<string, ReviewAuthor>(
    Object.entries(seed.authors).map(([author, profile]) => [
        author,
        { author, ...profile } as ReviewAuthor,
    ]),
);

/**
 * The promoter of the reviewed project, as far as the placeholders know them.
 *
 * @param review The review being read
 * @returns The placeholder profile, or undefined when the placeholders know no author for the project's owner
 */
export function getReviewPromoterPlaceholder(review: ProjectReview): ReviewAuthor | undefined {
    const project = getReviewProjectPlaceholder(review);

    return project ? authors.get(project.owner) : undefined;
}

/**
 * The consultant admin assigned to the review, as far as the placeholders know them.
 *
 * @param review The review being read
 * @returns The placeholder profile, or undefined when the placeholders know no author for the reviewer
 */
export function getReviewReviewerPlaceholder(review: ProjectReview): ReviewAuthor | undefined {
    return authors.get(review.reviewer);
}

/**
 * Seeds the in-memory store on first use.
 *
 * The parsed JSON is cloned so writes never reach the imported module, which the
 * runtime shares across requests handled by the same isolate.
 */
function store(): Map<string, ProjectReview> {
    if (reviews === undefined) {
        const seeded = new Map(
            seedReviews.map((review) => [String(review.id), structuredClone(review)]),
        );

        reviews = seeded;

        return seeded;
    }

    return reviews;
}

function find(reviewId: number | string): ProjectReview | undefined {
    return store().get(String(reviewId));
}

function findArea(review: ProjectReview, areaId: number | string): ReviewArea | undefined {
    return review.areas.find((area) => String(area.id) === String(areaId));
}

/**
 * Reads a review with its areas and their conversations.
 * @param id The review identifier, as in `/reviews/{id}`
 * @returns The review, or a 404 error when no review carries that id
 */
export function getReview(id: number | string): ReviewResult<ProjectReview> {
    const review = find(id);

    return review ? { data: review } : { error: NOT_FOUND };
}

/**
 * Reads a single reviewable area, that is, one risk and its conversation.
 * @param reviewId The review identifier, as in `/reviews/{id}`
 * @param areaId The area identifier, as in `/reviews/{id}/areas/{areaId}`
 * @returns The area, or a 404 error when the review or the area does not exist
 */
export function getReviewArea(
    reviewId: number | string,
    areaId: number | string,
): ReviewResult<ReviewArea> {
    const review = find(reviewId);
    const area = review ? findArea(review, areaId) : undefined;

    return area ? { data: area } : { error: NOT_FOUND };
}

/**
 * Resolves the profiles of everyone who has written in a review: the consultant,
 * the promoter, and whoever else takes part in the conversation.
 * @param reviewId The review identifier, as in `/reviews/{id}`
 * @returns Every known author of the review, empty when the review does not exist
 */
export function getReviewAuthors(reviewId: number | string): ReviewResult<ReviewAuthor[]> {
    const review = find(reviewId);

    if (!review) return { error: NOT_FOUND };

    const iris = new Set<string>([review.reviewer]);

    for (const area of review.areas) {
        for (const comment of area.comments) {
            iris.add(comment.author);
        }
    }

    return {
        data: [...iris].flatMap((iri) => {
            const profile = authors.get(iri);

            return profile ? [profile] : [];
        }),
    };
}

/**
 * Appends an entry to the conversation of an area, keeping the id sequence and
 * the area IRI in one place whether a person or the platform writes it.
 * @param area The area whose conversation receives the entry
 * @param author IRI of the User the entry belongs to
 * @param body The message body, left empty on entries the platform published
 * @param system Set on entries published by the platform instead of a person
 * @returns The stored entry
 */
function appendComment(
    area: ReviewArea,
    author: string,
    body: string,
    system?: ReviewSystemEvent,
): ReviewComment {
    const now = new Date().toISOString();

    const comment: ReviewComment = {
        id: Math.max(0, ...area.comments.map((stored) => stored.id)) + 1,
        author,
        body,
        area: area.review.replace(/\/$/, "") + `/areas/${area.id}`,
        dateCreated: now,
        dateUpdated: now,
    };

    if (system) comment.system = system;

    area.comments.push(comment);

    return comment;
}

/**
 * Outcome of assessing a risk: the area as it stands, plus the entry the change
 * published in its own conversation.
 */
export interface RiskChange {
    area: ReviewArea;
    /** Absent when there was nothing to announce, such as on a first assessment. */
    entry?: ReviewComment;
}

/**
 * Stores the risk assessed on an area, and announces the change in the area's
 * own conversation so both sides find it where they already talk about it.
 *
 * The announcement only happens on a genuine change between two assessed risks:
 * a first assessment has no previous value to name, and picking the same risk
 * again is not news.
 *
 * @param reviewId The review identifier, as in `/reviews/{id}/areas/{areaId}`
 * @param areaId The area identifier
 * @param risk The assessed risk, or null to clear the assessment
 * @param author IRI of the User making the change, kept as the entry's author
 * @returns The updated area plus the entry the change published, or a 404 error
 * when the review or the area does not exist
 */
export function setReviewAreaRisk(
    reviewId: number | string,
    areaId: number | string,
    risk: ProjectReviewRisk | null,
    author: string,
): ReviewResult<RiskChange> {
    const review = find(reviewId);
    const area = review ? findArea(review, areaId) : undefined;

    if (!area) return { error: NOT_FOUND };

    const previous = area.risk;

    area.risk = risk;

    const entry =
        previous && risk && previous !== risk
            ? appendComment(area, author, "", { from: previous, to: risk })
            : undefined;

    return { data: { area, entry } };
}

/**
 * Appends a message to the conversation of an area.
 * @param reviewId The review identifier, as in `/reviews/{id}/areas/{areaId}/comments`
 * @param areaId The area identifier
 * @param author IRI of the User writing the message
 * @param body The message body
 * @returns The stored message, or a 404 error when the review or the area does not exist
 */
export function createReviewAreaComment(
    reviewId: number | string,
    areaId: number | string,
    author: string,
    body: string,
): ReviewResult<ReviewComment> {
    const review = find(reviewId);
    const area = review ? findArea(review, areaId) : undefined;

    if (!area) return { error: NOT_FOUND };

    return { data: appendComment(area, author, body) };
}
