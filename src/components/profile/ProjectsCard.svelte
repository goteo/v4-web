<script lang="ts">
    import BaseActivityCard from "./BaseActivityCard.svelte";
    import { locale, t } from "../../i18n/store";
    import { client } from "../../openapi/client/client.gen.ts";
    import { apiUsersIdOrHandleGetUrl } from "../../openapi/client/operation-paths.gen.ts";
    import { apiAccountingsIdGet, apiProjectsGetCollection } from "../../openapi/client/sdk.gen.ts";
    import { getDefaultCurrency } from "../../utils/consts";
    import { formatAmountWithSymbol } from "../../utils/currencies";
    import { extractId } from "../../utils/extractId";
    import { toCollectionItems } from "../../utils/hydra.ts";
    import { sumMoney } from "../../utils/money";
    import LoadingSpinner from "../search/LoadingSpinner.svelte";

    import type { MoneyOutput, Project, User } from "../../openapi/client/types.gen.ts";
    import type { ProjectStatus, ProjectsSummary } from "../../types/me-page";

    interface Props {
        /**
         * Filter period (e.g. "2025"). Only used to re-fetch on change.
         */
        period?: string;

        /**
         * Authenticated user whose projects are listed
         */
        user: User;
    }

    let { period, user }: Props = $props();

    let projects = $state<Promise<ProjectsSummary | undefined>>();

    type ProjectsCollection = {
        member?: Project[];
        "hydra:member"?: Project[];
        totalItems?: number;
        "hydra:totalItems"?: number;
    };

    async function fetchProjects(): Promise<ProjectsSummary> {
        const headers = {
            "Accept-Language": $locale,
        };

        // Fetch user's owned projects - using user IRI as owner.
        // Use JSON-LD to get the real total count (only recent items are needed).
        const userIri = client.buildUrl({
            url: apiUsersIdOrHandleGetUrl,
            path: { idOrHandle: user.id },
        });

        const { data: projectsResponse, error: projectsError } = await apiProjectsGetCollection({
            baseUrl: "/api/relay",
            query: {
                owner: userIri,
                itemsPerPage: 3,
            },
            headers: {
                Accept: "application/ld+json",
                ...headers,
            },
        });

        if (projectsError) {
            console.error("Failed to fetch projects:", projectsError);
            throw projectsError;
        }

        const collection = (projectsResponse as unknown as ProjectsCollection) ?? {};
        const projects = toCollectionItems<Project>(collection);
        // JSON-LD metadata gives the real total, independent of the page size.
        const projectsCount =
            collection.totalItems ?? collection["hydra:totalItems"] ?? projects.length;

        // Sum the balance of each owned project's accounting
        const accountingIds = Array.from(
            new Set(
                projects
                    .map((project) => extractId(project.accounting))
                    .filter((id): id is string => Boolean(id)),
            ),
        );

        let projectsTotalAmount = 0;
        let projectsTotalCurrency: string | null = null;

        if (accountingIds.length > 0) {
            const accountingResults = await Promise.all(
                accountingIds.map(async (accountingId) => {
                    try {
                        const { data, error } = await apiAccountingsIdGet({
                            baseUrl: "/api/relay",
                            path: { id: accountingId },
                            headers,
                        });

                        if (error) {
                            console.warn("Failed to fetch accounting", {
                                accountingId,
                                error,
                            });
                            return null;
                        }

                        return data ?? null;
                    } catch (accountingError) {
                        console.warn("Error fetching accounting", {
                            accountingId,
                            accountingError,
                        });
                        return null;
                    }
                }),
            );

            const projectBalances = accountingResults
                .map((a) => a?.balance)
                .filter((b): b is MoneyOutput => b != null && typeof b.amount === "number");

            if (projectBalances.length > 0) {
                const total = sumMoney(projectBalances);
                projectsTotalAmount = total.amount ?? 0;
                projectsTotalCurrency = total.currency ?? getDefaultCurrency();
            }
        }

        // Map projects to recent projects
        const recentProjects = projects.slice(0, 3).map((project) => {
            // Use the slug for URLs, never the ID. Unless the slug is missing/invalid,
            // in which case the UI will handle the empty value gracefully.
            const projectSlug = project.slug && isNaN(Number(project.slug)) ? project.slug : "";

            return {
                id: project.id?.toString() || "",
                title: project.title || "",
                slug: projectSlug,
                status: (project.status as ProjectStatus) || "in_draft",
                createdAt: project.dateCreated || "",
            };
        });

        return {
            count: projectsCount,
            totalRaised: {
                amount: projectsTotalAmount,
                currency: projectsTotalCurrency ?? getDefaultCurrency(),
            },
            recentProjects,
        };
    }

    // Fetch on mount and re-fetch when the period changes
    $effect(() => {
        if (period) {
            projects = fetchProjects();
        }
    });
</script>

{#if projects}
    {#await projects}
        <!-- Loading state -->
        <div
            class="border-grey flex min-h-96 items-center justify-center rounded-4xl border bg-white"
        >
            <div class="flex items-center gap-2">
                <LoadingSpinner />
                <p class="text-content">{$t("system.loading")}</p>
            </div>
        </div>
    {:then summary}
        <BaseActivityCard
            titleKey="pages.me.projects.title"
            leftStatLabel="pages.me.projects.count"
            leftStatValue={summary?.count ?? 0}
            rightStatLabel="pages.me.projects.raised"
            rightStatValue={summary?.totalRaised
                ? formatAmountWithSymbol(
                      summary.totalRaised.amount,
                      summary.totalRaised.currency,
                      $locale,
                  )
                : ""}
            recentTitleKey="pages.me.projects.recent"
            illustrationPath="/images/profile/ilustration-project.png"
            primaryActionLabel="pages.me.projects.viewAll"
            primaryActionHref="/me#owned-projects"
            secondaryActionLabel="pages.me.projects.createNew"
            secondaryActionHref="/create/project"
            isEmpty={!summary || summary.count === 0}
            emptyMessageKey="pages.me.projects.empty"
            emptyCtaLabel="pages.me.projects.create"
            emptyCtaLink="/create/project"
        >
            {#if summary?.recentProjects}
                {#each summary.recentProjects.slice(0, 2) as project}
                    <li class="flex items-start gap-2">
                        {#if project.slug}
                            <a
                                href={`/project/${project.slug}`}
                                class="text-content hover:text-secondary focus:text-secondary text-sm no-underline focus:outline-none"
                            >
                                {project.title}
                            </a>
                        {:else}
                            <span class="text-tertiary text-sm italic">
                                {project.title}
                            </span>
                        {/if}
                    </li>
                {/each}
            {/if}
        </BaseActivityCard>
    {:catch projectsError}
        <div
            class="border-grey flex min-h-96 items-center justify-center rounded-4xl border bg-white"
        >
            <p class="text-tertiary font-semibold">{projectsError.message}</p>
        </div>
    {/await}
{:else}
    <!-- Loading state -->
    <div class="border-grey flex min-h-96 items-center justify-center rounded-4xl border bg-white">
        <div class="flex items-center gap-2">
            <LoadingSpinner />
            <p class="text-content">{$t("system.loading")}</p>
        </div>
    </div>
{/if}
