import { apiProjectsIdOrSlugGet, apiUsersGetCollectionUrl } from "../openapi/client";
import { extractId } from "../utils/extractId";

import type { Session } from "../auth/types";
import type { ProjectReview } from "../types/projectReview";

/**
 * Whether the signed in user acts as the consultant admin of a review.
 *
 * Only this role may assess risks and move the reviewed project through its
 * review statuses.
 * @param session The current session
 * @returns True when the user holds the admin role
 */
export function isConsultant(session?: Session): boolean {
    return !!session?.user.roles?.includes("ROLE_ADMIN");
}

/**
 * Whether the signed in user may read a review.
 *
 * A review is visible to the consultant admin carrying it out and to the promoter
 * who owns the reviewed project.
 * @param session The current session
 * @param review The review being accessed
 * @returns True when the user is the consultant or the promoter of the project
 */
export async function canAccessReview(
    session: Session | undefined,
    review: ProjectReview,
): Promise<boolean> {
    if (!session) return false;
    if (isConsultant(session)) return true;

    const projectId = extractId(review.project);
    if (!projectId) return false;

    // A promoter only reaches the reviews of their own projects, and their own User
    // resource already lists them, so this costs no extra request.
    if (Array.isArray(session.user.projects)) {
        return session.user.projects.some((iri) => extractId(iri) === projectId);
    }

    // Fall back to the Project's owner for sessions whose User carries no project
    // list, which is what happens when the API stops hydrating it.
    const { data: project } = await apiProjectsIdOrSlugGet({
        path: { idOrSlug: projectId },
        headers: session.token.asHttpHeaders,
    });

    return !!project?.owner && extractId(project.owner) === String(session.user.id);
}

/**
 * Builds the IRI of the User the current session belongs to, the shape the API
 * uses to reference a comment author.
 * @param session The current session
 * @returns The User IRI, or null when there is no session
 */
export function sessionUserIri(session: Session): string {
    return apiUsersGetCollectionUrl + `/${session.user.id}`;
}
