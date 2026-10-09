import { ActionError, defineAction } from "astro:actions";
import { z } from "zod";

import { apiProjectsIdPatch } from "../openapi/client";
import {
    createReviewAreaComment,
    getReview,
    setReviewAreaRisk,
    type ReviewError,
} from "../services/projectReview";
import { canAccessReview, isConsultant, sessionUserIri } from "../services/reviewAccess";
import { PROJECT_REVIEW_STATUSES } from "../types/projectReview";
import { extractId } from "../utils/extractId";

/**
 * Every action below posts to /_actions/*, which no firewall rule matches, so the
 * permissions of the reviews feature are enforced here rather than by the ACL.
 */

const reviewId = z.coerce.number().int().positive();
const areaId = z.coerce.number().int().positive();

/**
 * Turns a failure of the review service into the error the screens display.
 */
function fail(error: ReviewError | undefined, t: (key: string) => string): ActionError {
    if (error?.status === 401 || error?.status === 403) {
        return new ActionError({
            code: "FORBIDDEN",
            message: t("pages.review.errors.forbidden"),
        });
    }

    if (error === undefined || error.status === 404) {
        return new ActionError({
            code: "NOT_FOUND",
            message: t("pages.review.errors.areaNotFound"),
        });
    }

    return new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: t("pages.review.errors.generic"),
    });
}

/**
 * Assesses the risk of a reviewable area.
 *
 * The client sends which area to change, never the review as a whole: a caller
 * cannot use this to reach a review it is not the consultant of. The entry the
 * change publishes in the conversation comes back with the result, so the chat
 * already on screen shows it without waiting for a reload.
 */
export const updateReviewAreaRisk = defineAction({
    accept: "json",
    input: z.object({
        reviewId,
        areaId,
        risk: z.enum(["low", "mid", "high"]),
    }),
    handler: async (input, context) => {
        const { session, t, lang } = context.locals;

        if (!isConsultant(session)) {
            throw new ActionError({
                code: "FORBIDDEN",
                message: t("pages.review.errors.forbidden"),
            });
        }

        const { data, error } = await setReviewAreaRisk(
            input.reviewId,
            input.areaId,
            input.risk,
            sessionUserIri(session!),
            session!,
            lang,
        );

        if (error || !data) {
            throw fail(error, t);
        }

        // The chat renders `entry` right away: the page it is showing was rendered
        // before this change, so the entry only reaches it through this response.
        return { area: data.area, entry: data.entry };
    },
});

/**
 * Moves the reviewed project to another status of its review.
 *
 * The project is resolved from the review instead of being taken from the input,
 * so the status of a project cannot be changed through a review that is not its
 * own, and the target status is restricted to the review statuses.
 */
export const updateReviewProjectStatus = defineAction({
    accept: "json",
    input: z.object({
        reviewId,
        status: z.enum(PROJECT_REVIEW_STATUSES),
    }),
    handler: async (input, context) => {
        const { session, t, lang } = context.locals;

        if (!isConsultant(session)) {
            throw new ActionError({
                code: "FORBIDDEN",
                message: t("pages.review.errors.forbidden"),
            });
        }

        const { data: review } = await getReview(input.reviewId, session!, lang);

        if (!review) {
            throw new ActionError({
                code: "NOT_FOUND",
                message: t("pages.review.errors.notFound"),
            });
        }

        const projectId = extractId(review.project);

        if (!projectId) {
            throw new ActionError({
                code: "NOT_FOUND",
                message: t("pages.review.errors.notFound"),
            });
        }

        const { error } = await apiProjectsIdPatch({
            path: { id: projectId },
            headers: {
                ...session!.token.asHttpHeaders,
                "Content-Language": context.locals.lang,
            },
            body: { id: Number(projectId), status: input.status },
        });

        if (error) {
            console.error({ error });

            throw new ActionError({
                code: "INTERNAL_SERVER_ERROR",
                message: t("pages.review.errors.statusNotUpdated"),
            });
        }

        return { status: input.status };
    },
});

/**
 * Sends a message in the conversation of a reviewable area.
 *
 * Both the consultant and the promoter of the project take part, so this is the
 * one action open to both roles.
 */
export const sendReviewAreaComment = defineAction({
    accept: "json",
    input: z.object({
        reviewId,
        areaId,
        body: z.string("system.constraint.text.notEmpty").trim().min(1).max(2000),
    }),
    handler: async (input, context) => {
        const { session, t, lang } = context.locals;

        const { data: review } = await getReview(input.reviewId, session!, lang);

        if (!review) {
            throw new ActionError({
                code: "NOT_FOUND",
                message: t("pages.review.errors.notFound"),
            });
        }

        if (!(await canAccessReview(session, review))) {
            throw new ActionError({
                code: "FORBIDDEN",
                message: t("pages.review.errors.forbidden"),
            });
        }

        const { data: comment, error } = await createReviewAreaComment(
            input.reviewId,
            input.areaId,
            sessionUserIri(session!),
            input.body,
            session!,
            lang,
        );

        if (error || !comment) {
            throw fail(error, t);
        }

        return { comment };
    },
});