import { apiProjectsIdOrSlugGet, apiUsersIdOrHandleGet } from "../openapi/client";
import { extractId } from "../utils/extractId";

import type { Session } from "../auth/types";
import type { Locale } from "../i18n/locales";
import type { Project } from "../openapi/client";
import type { ProjectReview } from "../types/projectReview";

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
 * @param review The review being read
 * @param session The current session, needed to read a project only its owner or an admin may see
 * @param lang Active locale, sent so the API answers with translated content
 * @returns The project and its people, as far as the API knows them
 */
export async function getReviewedProject(
    review: ProjectReview,
    session: Session,
    lang: Locale,
): Promise<ReviewedProject> {
    const reviewer = await getPerson(review.reviewer, session, lang);
    const projectId = extractId(review.project);

    if (!projectId) {
        return { title: "", reviewer };
    }

    const { data, error } = await apiProjectsIdOrSlugGet({
        path: { idOrSlug: projectId },
        headers: { ...session.token.asHttpHeaders, "Accept-Language": lang },
    });

    if (!data) {
        // The review is the resource on screen: a project the API cannot answer
        // for is reported, but it does not take the review down with it.
        if (error && error.status !== 404) {
            console.error({ review: review.id, error });
        }

        return { title: "", reviewer };
    }

    const promoter = data.owner ? await getPerson(data.owner, session, lang) : undefined;

    return { title: data.title ?? "", promoter, reviewer, status: data.status };
}

/**
 * Resolves a User IRI into the profile the headers need.
 * @returns The profile, or undefined when the API does not know the User
 */
async function getPerson(
    iri: string,
    session: Session,
    lang: Locale,
): Promise<ReviewPerson | undefined> {
    const id = extractId(iri);

    if (!id) return undefined;

    const { data, error } = await apiUsersIdOrHandleGet({
        path: { idOrHandle: id },
        headers: { ...session.token.asHttpHeaders, "Accept-Language": lang },
    });

    if (error && error.status !== 404) {
        console.error({ user: id, error });
    }

    if (!data) return undefined;

    return { name: data.displayName ?? data.handle, handle: data.handle, avatar: data.avatar };
}
