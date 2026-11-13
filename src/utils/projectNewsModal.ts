const STORAGE_KEY_PREFIX = "goteo-project-news-modal";

function storageKey(userId: string, projectId: string): string {
    return `${STORAGE_KEY_PREFIX}:${userId}:${projectId}`;
}

function getStorage(): Storage | null {
    try {
        return typeof window === "undefined" ? null : window.localStorage;
    } catch {
        return null;
    }
}

/**
 * Reads the last project news the user acknowledged for a given project.
 *
 * The key is scoped by user so sharing a browser does not hide the news modal
 * from another supporter of the same project.
 */
export function getSeenProjectNewsId(
    userId: string | number,
    projectId: string | number,
): string | null {
    const storage = getStorage();
    if (!storage) return null;

    try {
        return storage.getItem(storageKey(String(userId), String(projectId)));
    } catch {
        return null;
    }
}

/**
 * Persists the news item the user closed so the news modal stays dismissed for it.
 */
export function markProjectNewsAsSeen(
    userId: string | number,
    projectId: string | number,
    newsId: string | number,
): void {
    const storage = getStorage();
    if (!storage) return;

    try {
        storage.setItem(storageKey(String(userId), String(projectId)), String(newsId));
    } catch (error) {
        console.error("Could not persist the seen project news:", error);
    }
}
