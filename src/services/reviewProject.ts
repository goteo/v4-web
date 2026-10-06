import {
    getReviewProjectPlaceholder,
    getReviewPromoterPlaceholder,
    getReviewReviewerPlaceholder,
} from "./projectReview";
import { apiProjectsIdOrSlugGet, apiUsersIdOrHandleGet } from "../openapi/client";
import { extractId } from "../utils/extractId";

import type { Session } from "../auth/types";
import type { Locale } from "../i18n/locales";
import type { Project } from "../openapi/client";
import type { ProjectReview, ReviewAuthor } from "../types/projectReview";

/**
 * One of the two people a review is about, as the review headers name them.
 */
export interface ReviewPerson {
    /** `displayName` from the API, falling back to the handle when unset. */
    name: string;
    /** Username, shown as `@handle` in titles. */
    handle: string;
    avatar?: string;
}

/**
 * The project behind a review, plus who is on either side of it.
 */
export interface ReviewedProject {
    title: string;
    /** The User promoting the project. */
    promoter?: ReviewPerson;
    /** The consultant admin assigned to the review. */
    reviewer?: ReviewPerson;
    status?: Project["status"];
}

/**
 * Resolves the project a review is about, together with the two people naming it.
 *
 * The API is the source of truth. The placeholder from the mocks only fills the gap
 * for a review whose project has no record in the API yet, so the screens stay
 * reachable while that data is still being built; both go away with the mocks.
 * @param review The review being read
 * @param session The current session, needed to read a project only its owner or an admin may see
 * @param lang Active locale, sent so the API answers with translated content
 * @returns The project and its people, or undefined when neither the API nor the placeholders know it
 */
export async function getReviewedProject(
    review: ProjectReview,
    session: Session,
    lang: Locale,
): Promise<ReviewedProject | undefined> {
    const projectId = extractId(review.project);
    const placeholder = getReviewProjectPlaceholder(review);
    const promoterFallback = getReviewPromoterPlaceholder(review);
    const reviewerFallback = getReviewReviewerPlaceholder(review);

    const reviewer = await getPerson(review.reviewer, reviewerFallback, session, lang);

    if (!projectId) {
        return {
            title: placeholder?.title ?? "",
            promoter: toPerson(promoterFallback),
            reviewer,
            status: placeholder?.status,
        };
    }

    const { data, error } = await apiProjectsIdOrSlugGet({
        path: { idOrSlug: projectId },
        headers: { ...session.token.asHttpHeaders, "Accept-Language": lang },
    });

    // A missing project is not fatal for a review: the review is the resource on
    // screen, and the placeholders may still know which project it belongs to.
    if (!data && error && error.status !== 404) {
        console.error({ review: review.id, error });
    }

    const promoter = data?.owner
        ? await getPerson(data.owner, promoterFallback, session, lang)
        : toPerson(promoterFallback);

    if (data) {
        return { title: data.title ?? "", promoter, reviewer, status: data.status };
    }

    return {
        title: placeholder?.title ?? "",
        promoter,
        reviewer,
        status: placeholder?.status,
    };
}

/**
 * Resolves a User IRI into the profile the headers need.
 *
 * Falls back to the placeholders so a review backed by mocks still names both
 * people instead of rendering a title with a hole in it.
 */
async function getPerson(
    iri: string,
    fallback: ReviewAuthor | undefined,
    session: Session,
    lang: Locale,
): Promise<ReviewPerson | undefined> {
    const id = extractId(iri);

    if (!id) return toPerson(fallback);

    const { data, error } = await apiUsersIdOrHandleGet({
        path: { idOrHandle: id },
        headers: { ...session.token.asHttpHeaders, "Accept-Language": lang },
    });

    if (error && error.status !== 404) {
        console.error({ user: id, error });
    }

    if (!data) return toPerson(fallback);

    return { name: data.displayName ?? data.handle, handle: data.handle, avatar: data.avatar };
}

function toPerson(author?: ReviewAuthor): ReviewPerson | undefined {
    return author ? { name: author.displayName, handle: author.handle } : undefined;
}