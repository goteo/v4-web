/**
 * Rules of the featured users section, shared by the admin form that edits it and the
 * action that validates it, so the two can never disagree on how many users fit.
 */

/**
 * How many users the home page section can show.
 *
 * The section renders one card per stored user, so this doubles as the cap on rows in
 * `featured_users`. Three fills a row exactly on wide screens, which is where the grid
 * reaches three columns.
 */
export const MAX_FEATURED_USERS = 3;
