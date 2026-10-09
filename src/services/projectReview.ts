import {
    apiProjectReviewAreasGetCollection,
    apiProjectReviewAreasGetCollectionUrl,
    apiProjectReviewAreasIdGet,
    apiProjectReviewAreasIdPatch,
    apiProjectReviewCommentsGetCollection,
    apiProjectReviewCommentsPost,
    apiProjectReviewsGetCollectionUrl,
    apiProjectReviewsIdGet,
    apiUsersIdOrHandleGet,
} from "../openapi/client";
import { extractId } from "../utils/extractId";

import type { Session } from "../auth/types";
import type { Locale } from "../i18n/locales";
import type {
    ProjectReviewArea as ApiProjectReviewArea,
    ProjectReviewComment as ApiProjectReviewComment,
} from "../openapi/client";
import type {
    ProjectReview,
    ProjectReviewRisk,
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

/**
 * How many areas or comments a single request may carry. Conversations on a
 * reviewable area stay well below this, and one page keeps the screens on a
 * fixed number of round-trips.
 */
const ITEMS_PER_PAGE = 100;

/**
 * Prefix marking a stored comment as a system entry the platform published, and
 * never as a message somebody wrote. The comment API has no field for such
 * entries, so the event travels in the body as this marker followed by the JSON
 * the card is built from, and is decoded again when the conversation is read.
 */
const SYSTEM_EVENT_MARKER = "GOTEO_REVIEW_SYSTEM:";

/**
 * Request headers every review endpoint expects: the session token, and the
 * active locale so the API answers with translated content where it has any.
 */
function apiHeaders(session: Session, lang: Locale): Record<string, unknown> {
    return { ...session.token.asHttpHeaders, "Accept-Language": lang };
}

/**
 * Maps a failure of the generated client onto the `{ status }` callers handle.
 *
 * The client resolves with the error document the API sends, which carries the
 * status itself; anything else (a network failure, an unparsable body) reads as
 * a server error rather than pretending the resource was missing.
 */
function toReviewError(error: unknown): ReviewError {
    const status = Number((error as { status?: unknown } | undefined)?.status);

    return { status: Number.isFinite(status) && status > 0 ? status : 500 };
}

/** IRI of the User resource the given id belongs to. */
function reviewIri(reviewId: number | string): string {
    return `${apiProjectReviewsGetCollectionUrl}/${reviewId}`;
}

/** IRI of the area resource the given id belongs to. */
function areaIri(areaId: number | string): string {
    return `${apiProjectReviewAreasGetCollectionUrl}/${areaId}`;
}

/**
 * Reads a review without its areas.
 *
 * Access checks and the project status action only need to know which project
 * a review belongs to, so they pay for one request instead of the three the
 * full conversation costs.
 * @param reviewId The review identifier, as in `/reviews/{id}`
 * @param session The current session, carrying the token the API authenticates
 * @param lang Active locale, sent so the API answers with translated content
 * @returns The review, or the failure the API answered with
 */
export async function getReview(
    reviewId: number | string,
    session: Session,
    lang: Locale,
): Promise<ReviewResult<ProjectReview>> {
    const { data, error } = await apiProjectReviewsIdGet({
        path: { id: String(reviewId) },
        headers: apiHeaders(session, lang),
    });

    if (!data) return { error: toReviewError(error) };

    return {
        data: {
            id: data.id ?? 0,
            project: data.project ?? "",
            reviewer: data.reviewer ?? "",
            type: data.type ?? "campaign",
            areas: [],
        },
    };
}

/**
 * Reads the reviewable areas of a review, each with its conversation.
 * @param reviewId The review identifier, as in `/reviews/{id}`
 * @param session The current session, carrying the token the API authenticates
 * @param lang Active locale, sent so the API answers with translated content
 * @returns The areas, or the failure the API answered with
 */
export async function getReviewAreas(
    reviewId: number | string,
    session: Session,
    lang: Locale,
): Promise<ReviewResult<ReviewArea[]>> {
    const { data, error } = await apiProjectReviewAreasGetCollection({
        query: {
            review: reviewIri(reviewId),
            itemsPerPage: ITEMS_PER_PAGE,
            "order[dateCreated]": "asc",
        },
        headers: apiHeaders(session, lang),
    });

    if (!data) return { error: toReviewError(error) };

    const conversations = await loadConversations(areaIrisOf(data), session, lang);

    if (conversations.error || !conversations.data) {
        return { error: conversations.error ?? NOT_FOUND };
    }

    const byArea = conversations.data;

    return {
        data: data.map((area) => toArea(area, byArea.get(String(area.id)) ?? [])),
    };
}

/**
 * Reads one reviewable area of a review, with its conversation.
 *
 * The area is refused when it belongs to another review, so the identifier a
 * page asks for and the one the session may read cannot drift apart.
 * @param reviewId The review identifier the area must belong to
 * @param areaId The area identifier, as in `/reviews/{id}/{areaId}`
 * @param session The current session, carrying the token the API authenticates
 * @param lang Active locale, sent so the API answers with translated content
 * @returns The area, or a 404 error when it does not exist or belongs elsewhere
 */
export async function getReviewArea(
    reviewId: number | string,
    areaId: number | string,
    session: Session,
    lang: Locale,
): Promise<ReviewResult<ReviewArea>> {
    const { data: area, error: readError } = await apiProjectReviewAreasIdGet({
        path: { id: String(areaId) },
        headers: apiHeaders(session, lang),
    });

    if (!area || extractId(area.review) !== String(reviewId)) {
        return { error: readError ? toReviewError(readError) : NOT_FOUND };
    }

    const conversations = await loadConversations([areaIri(areaId)], session, lang);

    if (conversations.error || !conversations.data) {
        return { error: conversations.error ?? NOT_FOUND };
    }

    return { data: toArea(area, conversations.data.get(String(areaId)) ?? []) };
}

/**
 * Resolves the profiles of everyone who has written in a review: the consultant
 * and whoever takes part in the conversations on screen.
 * @param review The review being read, whose reviewer always takes part
 * @param areas The areas whose conversations are on screen
 * @param session The current session, carrying the token the API authenticates
 * @param lang Active locale, sent so the API answers with translated content
 * @returns Every author the API knows, without the ones it cannot resolve
 */
export async function getReviewAuthors(
    review: ProjectReview,
    areas: ReviewArea[],
    session: Session,
    lang: Locale,
): Promise<ReviewResult<ReviewAuthor[]>> {
    const iris = new Set<string>();

    if (review.reviewer) iris.add(review.reviewer);

    for (const area of areas) {
        for (const comment of area.comments) {
            iris.add(comment.author);
        }
    }

    const authors = await Promise.all(
        [...iris].map((iri) => fetchAuthor(iri, session, lang)),
    );

    return {
        data: authors.filter((author): author is ReviewAuthor => author !== undefined),
    };
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
 * again is not news. The comment API has no field for an entry the platform
 * published, so the entry is stored as a comment whose body carries
 * {@link SYSTEM_EVENT_MARKER} followed by the change's detail, and is decoded
 * again when the conversation is read.
 *
 * @param reviewId The review identifier the area must belong to
 * @param areaId The area identifier
 * @param risk The assessed risk
 * @param author IRI of the User making the change, kept as the entry's author
 * @param session The current session, carrying the token the API authenticates
 * @param lang Active locale, sent so the API answers with translated content
 * @returns The updated area plus the entry the change published, or a 404 error
 * when the review or the area does not exist
 */
export async function setReviewAreaRisk(
    reviewId: number | string,
    areaId: number | string,
    risk: ProjectReviewRisk,
    author: string,
    session: Session,
    lang: Locale,
): Promise<ReviewResult<RiskChange>> {
    const headers = apiHeaders(session, lang);

    const { data: current, error: readError } = await apiProjectReviewAreasIdGet({
        path: { id: String(areaId) },
        headers,
    });

    if (!current || extractId(current.review) !== String(reviewId)) {
        return { error: readError ? toReviewError(readError) : NOT_FOUND };
    }

    const previous = current.risk ?? null;

    const { data: area, error } = await apiProjectReviewAreasIdPatch({
        path: { id: String(areaId) },
        body: { risk },
        headers,
    });

    if (!area) return { error: toReviewError(error) };

    const entry =
        previous && previous !== risk
            ? await persistSystemEntry(areaId, author, previous, risk, session, lang)
            : undefined;

    const conversations = await loadConversations([areaIri(areaId)], session, lang);

    if (conversations.error || !conversations.data) {
        return { error: conversations.error ?? NOT_FOUND };
    }

    return { data: { area: toArea(area, conversations.data.get(String(areaId)) ?? []), entry } };
}

/**
 * Appends a message to the conversation of an area.
 * @param reviewId The review identifier the area must belong to
 * @param areaId The area identifier
 * @param author IRI of the User writing the message
 * @param body The message body
 * @param session The current session, carrying the token the API authenticates
 * @param lang Active locale, sent so the API answers with translated content
 * @returns The stored message, or a 404 error when the review or the area does not exist
 */
export async function createReviewAreaComment(
    reviewId: number | string,
    areaId: number | string,
    author: string,
    body: string,
    session: Session,
    lang: Locale,
): Promise<ReviewResult<ReviewComment>> {
    const headers = apiHeaders(session, lang);

    // Checked first so a message can never land on an area of another review.
    const { data: area, error: readError } = await apiProjectReviewAreasIdGet({
        path: { id: String(areaId) },
        headers,
    });

    if (!area || extractId(area.review) !== String(reviewId)) {
        return { error: readError ? toReviewError(readError) : NOT_FOUND };
    }

    const { data, error } = await apiProjectReviewCommentsPost({
        body: { area: areaIri(areaId), author, body },
        headers,
    });

    if (!data) return { error: toReviewError(error) };

    return { data: toComment(data) };
}

/** IRI of every area of the given list, which is what the comments filter takes. */
function areaIrisOf(areas: ApiProjectReviewArea[]): string[] {
    return areas.flatMap((area) => (area.id !== undefined ? [areaIri(area.id)] : []));
}

/**
 * Reads the conversations of the given areas, grouped by area id.
 * @param areaIris IRIs of the areas whose messages are wanted
 * @param session The current session, carrying the token the API authenticates
 * @param lang Active locale, sent so the API answers with translated content
 * @returns Messages ordered oldest first, or the failure the API answered with
 */
async function loadConversations(
    areaIris: string[],
    session: Session,
    lang: Locale,
): Promise<ReviewResult<Map<string, ReviewComment[]>>> {
    const grouped = new Map<string, ReviewComment[]>(
        areaIris.flatMap((iri) => {
            const id = extractId(iri);

            return id ? [[id, [] as ReviewComment[]]] : [];
        }),
    );

    if (!areaIris.length) return { data: grouped };

    const { data, error } = await apiProjectReviewCommentsGetCollection({
        query: {
            "area[]": areaIris,
            itemsPerPage: ITEMS_PER_PAGE,
            "order[dateCreated]": "asc",
        },
        headers: apiHeaders(session, lang),
    });

    if (!data) return { error: toReviewError(error) };

    for (const comment of data) {
        const id = extractId(comment.area);

        if (!id) continue;

        const bucket = grouped.get(id) ?? [];

        bucket.push(toComment(comment));
        grouped.set(id, bucket);
    }

    return { data: grouped };
}

/**
 * Resolves a User IRI into the profile a chat bubble needs.
 * @returns The profile, or undefined when the API does not know the User
 */
async function fetchAuthor(
    iri: string,
    session: Session,
    lang: Locale,
): Promise<ReviewAuthor | undefined> {
    const id = extractId(iri);

    if (!id) return undefined;

    const { data, error } = await apiUsersIdOrHandleGet({
        path: { idOrHandle: id },
        headers: apiHeaders(session, lang),
    });

    if (!data) {
        if (error && toReviewError(error).status !== 404) {
            console.error({ author: iri, error });
        }

        return undefined;
    }

    return {
        author: iri,
        handle: data.handle,
        displayName: data.displayName ?? data.handle,
        avatar: data.avatar,
    };
}

/**
 * Stores the entry a risk change publishes in the conversation of its area, so
 * both parties find it on any later visit, not only in the open conversation.
 *
 * The comment API expects the writer to be the authenticated User, which the
 * consultant making the change is. When the entry cannot be stored the change
 * falls back to an in-memory one, so the card is still announced live even if
 * persistence fails.
 */
async function persistSystemEntry(
    areaId: number | string,
    author: string,
    from: ProjectReviewRisk,
    to: ProjectReviewRisk,
    session: Session,
    lang: Locale,
): Promise<ReviewComment> {
    const body = `${SYSTEM_EVENT_MARKER}${JSON.stringify({ from, to })}`;

    const { data, error } = await apiProjectReviewCommentsPost({
        body: { area: areaIri(areaId), author, body },
        headers: apiHeaders(session, lang),
    });

    if (data) return toComment(data);

    console.error({ event: SYSTEM_EVENT_MARKER, areaId, from, to, error });

    return systemEntry(areaId, author, from, to);
}

/**
 * Builds an in-memory entry in the shape the chat renders as a card, kept as
 * the fallback for a change that could not be stored but is still announced in
 * the conversation already on screen.
 */
function systemEntry(
    areaId: number | string,
    author: string,
    from: ProjectReviewRisk,
    to: ProjectReviewRisk,
): ReviewComment {
    const now = new Date().toISOString();

    return {
        // Negative, so it can never collide with an id the API assigns.
        id: -Date.now(),
        author,
        area: areaIri(areaId),
        body: "",
        dateCreated: now,
        dateUpdated: now,
        system: { from, to },
    };
}

/** Projects the area resource onto the shape the review screens consume. */
function toArea(area: ApiProjectReviewArea, comments: ReviewComment[]): ReviewArea {
    return {
        id: area.id ?? 0,
        review: area.review ?? "",
        title: area.title ?? "",
        summary: area.summary ?? "",
        risk: area.risk ?? null,
        comments,
    };
}

/** Whether the given value is one of the risks a card can announce. */
function isReviewRisk(value: unknown): value is ProjectReviewRisk {
    return value === "low" || value === "mid" || value === "high";
}

/**
 * Reads the system event a stored comment was encoded with, if it is one.
 *
 * Comments the platform publishes (a risk change) travel under
 * {@link SYSTEM_EVENT_MARKER} followed by the JSON the card is built from; a
 * message that merely contains the marker without the expected shape is left as
 * written and rendered as the text it is.
 */
function decodeSystemEvent(body: string): ReviewSystemEvent | undefined {
    if (!body.startsWith(SYSTEM_EVENT_MARKER)) return undefined;

    try {
        const parsed = JSON.parse(body.slice(SYSTEM_EVENT_MARKER.length)) as {
            from?: unknown;
            to?: unknown;
        };

        if (!isReviewRisk(parsed.from) || !isReviewRisk(parsed.to)) return undefined;

        return { from: parsed.from, to: parsed.to };
    } catch {
        return undefined;
    }
}

/** Projects the comment resource onto the shape the review screens consume. */
function toComment(comment: ApiProjectReviewComment): ReviewComment {
    const dateCreated = comment.dateCreated ?? new Date().toISOString();
    const system = decodeSystemEvent(comment.body);

    return {
        id: comment.id ?? 0,
        author: comment.author,
        area: comment.area,
        // System entries read their card off `system`, so the marker is not left
        // on screen as if it were written text.
        body: system ? "" : comment.body,
        dateCreated,
        dateUpdated: comment.dateUpdated ?? dateCreated,
        system,
    };
}
