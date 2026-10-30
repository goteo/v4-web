import { z } from "zod";

import { zProject, zProjectReviewArea, zProjectReviewComment } from "../openapi/client/zod.gen";
import { PROJECT_REVIEW_STATUSES } from "../types/projectReview";

const commentBodySchema = zProjectReviewComment.shape.body;

/** How long a message may be; the API itself states no limit, so this is ours. */
export const REVIEW_COMMENT_MAX_LENGTH = 2000;

/**
 * How long a message must be. Read off the SDK schema the API validates comments
 * with, so both sides enforce the same rule and `pnpm sdk` keeps them in step.
 */
export const REVIEW_COMMENT_MIN_LENGTH = commentBodySchema.minLength ?? 15;

export const zReviewId = z.coerce.number().int().positive();
export const zReviewAreaId = z.coerce.number().int().positive();

/**
 * Risk values come straight from the SDK so they stay in sync with the API. The
 * schema marks the field optional because areas are patched one field at a time.
 */
export const zReviewRisk = zProjectReviewArea.shape.risk.unwrap();

/**
 * Statuses a review may move a project into, widened for the membership test:
 * the SDK schema accepts every project status, and this narrows it to the ones
 * the review flow handles.
 */
const reviewStatuses: readonly string[] = PROJECT_REVIEW_STATUSES;

export const zReviewStatus = zProject.shape.status
    .unwrap()
    .unwrap()
    .refine((status) => reviewStatuses.includes(status), {
        error: "system.validation.review.status",
    });

/**
 * Comment body: trimmed before the checks run, so the length the API enforces is
 * read off the message that is really sent rather than off the spaces around it.
 * The minimum belongs to the SDK schema, and the upper bound is the one
 * validation the API does not express.
 */
export const zReviewCommentBody = z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    commentBodySchema.refine((body) => body.length <= REVIEW_COMMENT_MAX_LENGTH, {
        error: "system.validation.review.comment.max",
        params: { max: REVIEW_COMMENT_MAX_LENGTH },
    }),
);

export const zUpdateReviewAreaRiskInput = z.object({
    reviewId: zReviewId,
    areaId: zReviewAreaId,
    risk: zReviewRisk,
});

export const zUpdateReviewProjectStatusInput = z.object({
    reviewId: zReviewId,
    status: zReviewStatus,
});

export const zSendReviewAreaCommentInput = z.object({
    reviewId: zReviewId,
    areaId: zReviewAreaId,
    body: zReviewCommentBody,
});
