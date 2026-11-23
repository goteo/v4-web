<script lang="ts">
    import { onMount } from "svelte";

    import { session } from "../../auth/store.ts";
    import { t } from "../../i18n/store";
    import {
        apiProjectReviewsGetCollection,
        apiProjectsGetCollection,
    } from "../../openapi/client/sdk.gen.ts";
    import { extractId } from "../../utils/extractId";
    import { toCollectionItems } from "../../utils/hydra.ts";
    import {
        projectActionHref,
        statusCardConfig,
        tabStatusGroups,
    } from "../../utils/ownedProjectCards";
    import CampaignCard, {
        type OwnedCardActionView,
        type OwnedCardConfig,
    } from "../home/CampaignCard.svelte";
    import Loader from "../library/feedback/Loader.svelte";
    import Carousel from "../library/layout/Carousel.svelte";
    import Tabs from "../library/layout/Tabs.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { Project, ProjectReview, User } from "../../openapi/client/types.gen.ts";
    import type { Campaign } from "../../types/campaign";

    interface Props {
        lang: string;
        user: User;
    }

    let { lang, user }: Props = $props();

    let ownedProjects = $state<Campaign[]>([]);
    let loading = $state(true);
    // Latest review id per project id, for the advisory and review links
    let reviewIdByProject = $state<Map<string, number>>(new Map());

    async function fetchReviews(projectIds: number[], headers: Record<string, unknown>) {
        const { data, error } = await apiProjectReviewsGetCollection({
            query: {
                "project[]": projectIds.map((id) => `/v4/projects/${id}`),
                itemsPerPage: 100,
            },
            headers,
        });

        if (error) {
            console.error("Failed to fetch owned project reviews:", error);
            return;
        }

        const latest = new Map<string, number>();
        for (const review of toCollectionItems<ProjectReview>(data)) {
            const projectId = extractId(review.project);
            if (!projectId || !review.id) continue;
            latest.set(projectId, Math.max(review.id, latest.get(projectId) ?? 0));
        }
        reviewIdByProject = latest;
    }

    async function fetchOwnedProjects() {
        loading = true;

        try {
            const headers = {
                "Accept-Language": lang,
                ...$session?.token.asHttpHeaders,
            };

            // Get all of the user's owned projects, regardless of status
            const userIri = `/v4/users/${user.id}`;
            const { data: projects, error: projectsError } = await apiProjectsGetCollection({
                query: {
                    owner: userIri,
                    itemsPerPage: 10,
                },
                headers,
            });

            if (projectsError) {
                console.error("Failed to fetch owned projects:", projectsError);
                return;
            }

            const projectItems = toCollectionItems<Project>(projects);

            if (projectItems.length > 0) {
                // Transform projects to Campaign format
                const campaigns = (await Promise.all(
                    projectItems.map(async (project) => {
                        return {
                            ...project,
                            slug: project.slug!,
                            title: project.title!,
                            image:
                                project.cover ??
                                project.video?.cover ??
                                project.video?.thumbnail ??
                                "/images/project/placeholder-project-update.jpg",
                            minimum: project.budget?.minimum?.money,
                            optimum: project.budget?.optimum?.money,
                            category: project.categories?.[0], // Get first category
                        } satisfies Campaign;
                    }),
                )) as Campaign[];

                ownedProjects = campaigns;
                await fetchReviews(
                    projectItems.map((project) => project.id!),
                    headers,
                );
            } else {
                ownedProjects = [];
            }
        } catch (error) {
            console.error("Error fetching owned projects:", error);
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        fetchOwnedProjects();
    });

    function projectsForTab(tabId: string): Campaign[] {
        const statuses = tabStatusGroups[tabId] ?? [];
        return ownedProjects
            .filter((project) => project.status !== undefined && statuses.includes(project.status))
            .sort((a, b) => statuses.indexOf(a.status!) - statuses.indexOf(b.status!));
    }

    const tabs = $derived([
        { id: "active", label: $t("pages.me.ownedProjects.tabs.active") },
        { id: "review", label: $t("pages.me.ownedProjects.tabs.inReview") },
        { id: "funding", label: $t("pages.me.ownedProjects.tabs.funding") },
        { id: "draft", label: $t("pages.me.ownedProjects.tabs.draft") },
        { id: "archived", label: $t("pages.me.ownedProjects.tabs.archived") },
    ]);
</script>

{#if loading}
    <Loader />
{:else if ownedProjects.length > 0}
    <div class="flex flex-col gap-6">
        <Title level={2} variant="section">
            {$t("pages.me.ownedProjects.title")}
        </Title>
        <Tabs {tabs} activeTab="active" alignment="left" />

        {#snippet ownedProjectsCarousel(projects: Campaign[], emptyMessage?: string)}
            <Carousel itemsPerGroup={3} gap={24} showDots={false} {emptyMessage}>
                {#each projects as campaign, index (campaign.id)}
                    {@const config = statusCardConfig(campaign.status)}
                    {@const ownedConfig: OwnedCardConfig | undefined = config && {
                        tagLabel: config.tagKey ? $t(`pages.me.ownedProjects.card.${config.tagKey}`) : undefined,
                        showMoney: config.showMoney,
                        actions: config.actions
                            .map<OwnedCardActionView>((action) => ({
                                key: action.key,
                                label: $t(`pages.me.ownedProjects.card.${action.key}`),
                                kind: action.kind,
                                href: projectActionHref(
                                    action.key,
                                    campaign,
                                    reviewIdByProject.get(String(campaign.id)),
                                ),
                            }))
                            .filter((action) => action.href),
                    }}
                    <CampaignCard size={index === 0 ? "large" : "small"} {campaign} {ownedConfig} />
                {/each}
            </Carousel>
        {/snippet}

        <div data-tab-content="active">
            {@render ownedProjectsCarousel(
                projectsForTab("active"),
                $t("pages.me.ownedProjects.emptyTab.active"),
            )}
        </div>

        <div data-tab-content="review" style="display:none">
            {@render ownedProjectsCarousel(
                projectsForTab("review"),
                $t("pages.me.ownedProjects.emptyTab.review"),
            )}
        </div>

        <div data-tab-content="funding" style="display:none">
            {@render ownedProjectsCarousel(
                projectsForTab("funding"),
                $t("pages.me.ownedProjects.emptyTab.funding"),
            )}
        </div>

        <div data-tab-content="draft" style="display:none">
            {@render ownedProjectsCarousel(
                projectsForTab("draft"),
                $t("pages.me.ownedProjects.emptyTab.draft"),
            )}
        </div>

        <div data-tab-content="archived" style="display:none">
            {@render ownedProjectsCarousel(
                projectsForTab("archived"),
                $t("pages.me.ownedProjects.emptyTab.archived"),
            )}
        </div>
    </div>
{/if}
