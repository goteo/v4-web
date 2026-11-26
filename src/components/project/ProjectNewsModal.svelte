<script lang="ts">
    import ProjectUpdateModal from "./ProjectUpdateModal.svelte";
    import { session } from "../../auth/store";
    import {
        apiProjectSupportsGetCollection,
        apiProjectUpdatesGetCollection,
    } from "../../openapi/client/index";
    import { toCollectionItems } from "../../utils/hydra.ts";
    import { getSeenProjectNewsId, markProjectNewsAsSeen } from "../../utils/projectNewsModal";

    import type { Project, ProjectSupport, ProjectUpdate } from "../../openapi/client/index";

    let {
        project,
        lang,
    }: {
        project: Project;
        lang: string;
    } = $props();

    const projectId = $derived(project.id?.toString());

    let open = $state(false);
    let triggeredNews: ProjectUpdate | null = $state(null);
    let checkedKey = $state("");

    function logDiagnostic(message: string, data?: Record<string, unknown>) {
        if (!import.meta.env.DEV) return;

        console.info(`[project-news] ${message}`, data ?? "");
    }

    async function fetchLatestNews(id: string): Promise<ProjectUpdate | undefined> {
        const { data, error } = await apiProjectUpdatesGetCollection({
            query: { project: id, "order[date]": "desc", itemsPerPage: 1 },
            headers: { "Accept-Language": lang },
        });

        if (error) {
            console.warn("Could not load the latest project news:", error);
            return undefined;
        }

        return toCollectionItems<ProjectUpdate>(data)[0];
    }

    async function hasSupportedProject(id: string, origin: string): Promise<boolean> {
        const { data, error } = await apiProjectSupportsGetCollection({
            baseUrl: "/api/relay",
            query: { project: id, origin },
            headers: { Accept: "application/ld+json" },
        });

        if (error) {
            console.warn("Could not check the project support for the news modal:", error);
            return false;
        }

        return toCollectionItems<ProjectSupport>(data).length > 0;
    }

    async function checkForNews(userId: string, id: string, origin: string) {
        const latestNews = await fetchLatestNews(id);

        if (!latestNews?.id) {
            logDiagnostic("no updates found for the project", { projectId: id });
            return;
        }

        const seenId = getSeenProjectNewsId(userId, id);
        if (String(latestNews.id) === seenId) {
            logDiagnostic("the latest update was already dismissed", {
                projectId: id,
                updateId: latestNews.id,
            });
            return;
        }

        if (!(await hasSupportedProject(id, origin))) {
            logDiagnostic("the user has not supported this project", {
                projectId: id,
                origin,
            });
            return;
        }

        logDiagnostic("opening the news modal", { projectId: id, updateId: latestNews.id });
        open = true;
        triggeredNews = latestNews;
    }

    $effect(() => {
        const currentSession = $session;
        const id = projectId;

        if (!currentSession) {
            logDiagnostic("waiting for an authenticated session");
            return;
        }

        if (!id) return;

        const userId = currentSession.user.id?.toString();
        const origin = currentSession.user.accounting;

        if (!userId || !origin) {
            logDiagnostic("the session has no user id or accounting", { userId, origin });
            return;
        }

        // One check per user and project, no matter how many times the session
        // or the project object is refreshed.
        const key = `${userId}:${id}`;
        if (checkedKey === key) return;

        checkedKey = key;
        void checkForNews(userId, id, origin);
    });

    $effect(() => {
        if (open || !triggeredNews) return;

        const userId = $session?.user.id?.toString();
        const id = projectId;

        if (userId && id && triggeredNews.id != null) {
            markProjectNewsAsSeen(userId, id, triggeredNews.id);
        }

        triggeredNews = null;
    });
</script>

<ProjectUpdateModal bind:open update={triggeredNews} />
