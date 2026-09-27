<script lang="ts">
    import BaseActivityCard from "./BaseActivityCard.svelte";
    import { locale, t } from "../../i18n/store";
    import {
        apiProjectSupportsGetCollection,
        apiProjectSupportsmoneyTotalGetCollection,
        apiProjectsGetCollection,
    } from "../../openapi/client/sdk.gen.ts";
    import { getDefaultCurrency } from "../../utils/consts";
    import { formatAmountWithSymbol } from "../../utils/currencies";
    import { extractId } from "../../utils/extractId";
    import { toCollectionItems } from "../../utils/hydra.ts";
    import LoadingSpinner from "../search/LoadingSpinner.svelte";

    import type { Project, ProjectSupport, User } from "../../openapi/client/types.gen.ts";
    import type { DonationsSummary } from "../../types/me-page";

    interface Props {
        /**
         * Filter period (e.g. "2025"). Only used to re-fetch on change.
         */
        period?: string;

        /**
         * Authenticated user whose donations are listed
         */
        user: User;
    }

    let { period, user }: Props = $props();

    let donations = $state<Promise<DonationsSummary | undefined>>();

    type ProjectSupportsCollection = {
        member?: ProjectSupport[];
        "hydra:member"?: ProjectSupport[];
        totalItems?: number;
        "hydra:totalItems"?: number;
    };

    async function fetchDonations(): Promise<DonationsSummary> {
        // Fetch user's donations - using accounting IRI as origin.
        // project_supports is NOT a localized resource, so no Accept-Language header is sent.
        // Use JSON-LD to get the real total count (only recent items are needed, so a tiny page).
        const { data: supportsResponse, error: supportsError } =
            await apiProjectSupportsGetCollection({
                baseUrl: "/api/relay",
                query: {
                    origin: user.accounting,
                    itemsPerPage: 3,
                },
                headers: { Accept: "application/ld+json" },
            });

        if (supportsError) {
            console.error("Failed to fetch contributions:", supportsError);
            throw new Error("Failed to load donation data");
        }

        const collection = (supportsResponse as unknown as ProjectSupportsCollection) ?? {};
        const contributions = toCollectionItems<ProjectSupport>(collection);
        // JSON-LD metadata gives the real total, independent of the page size.
        const contributionsCount =
            collection.totalItems ?? collection["hydra:totalItems"] ?? contributions.length;

        // Total money comes from the dedicated endpoint (there is no manual calculation,
        // since summing the capped "recent" page would be wrong).
        const { data: totalMoney, error: totalMoneyError } =
            await apiProjectSupportsmoneyTotalGetCollection({
                baseUrl: "/api/relay",
                query: {
                    origin: user.accounting,
                },
            });
        if (totalMoneyError) {
            console.warn("Total money endpoint returned error:", {
                error: totalMoneyError,
                user,
            });
        }

        // Resolve project details with a single batched request by slug/id,
        // instead of one GET per project.
        const idOrSlugs = Array.from(
            new Set(
                contributions
                    .map((support) =>
                        extractId(
                            typeof support.project === "string" ? support.project : undefined,
                        ),
                    )
                    .filter((idOrSlug): idOrSlug is string => Boolean(idOrSlug)),
            ),
        );

        const projectByIdOrSlug = new Map<string, Project>();
        if (idOrSlugs.length > 0) {
            const { data: projectsResponse, error: projectsError } = await apiProjectsGetCollection(
                {
                    baseUrl: "/api/relay",
                    query: {
                        "slug[]": idOrSlugs,
                    },
                    // Projects ARE localized, so force the current language here.
                    headers: { "Accept-Language": $locale },
                },
            );

            if (projectsError) {
                console.warn("Failed to fetch projects for donations:", projectsError);
            } else {
                for (const project of toCollectionItems<Project>(projectsResponse)) {
                    if (project.slug) {
                        projectByIdOrSlug.set(project.slug, project);
                    }
                    if (project.id) {
                        projectByIdOrSlug.set(String(project.id), project);
                    }
                }
            }
        }

        const recentDonations = contributions.slice(0, 3).map((support) => {
            const idOrSlug = extractId(
                typeof support.project === "string" ? support.project : undefined,
            );
            const project = idOrSlug ? projectByIdOrSlug.get(idOrSlug) : undefined;

            // Use the slug for URLs, never the ID. Unless the slug is missing/invalid,
            // in which case the UI will handle the empty value gracefully.
            const projectSlug = project?.slug && isNaN(Number(project.slug)) ? project.slug : "";

            return {
                id: support.id?.toString() || idOrSlug || "",
                amount: support.money || { amount: 0, currency: getDefaultCurrency() },
                projectTitle: project?.title || "",
                projectSlug,
            };
        });

        return {
            count: contributionsCount,
            total: {
                amount: totalMoney?.amount ?? 0,
                currency: totalMoney?.currency ?? getDefaultCurrency(),
            },
            recentDonations,
        };
    }

    // Fetch on mount and re-fetch when the period changes
    $effect(() => {
        if (period) {
            donations = fetchDonations();
        }
    });
</script>

{#snippet loadingShell()}
    <div class="border-grey flex min-h-96 items-center justify-center rounded-4xl border bg-white">
        <div class="flex items-center gap-2">
            <LoadingSpinner />
            <p class="text-content">{$t("system.loading")}</p>
        </div>
    </div>
{/snippet}

{#snippet errorShell(message: unknown)}
    <div class="border-grey flex min-h-96 items-center justify-center rounded-4xl border bg-white">
        <p class="text-tertiary font-semibold">{message}</p>
    </div>
{/snippet}

{#if donations}
    {#await donations}
        {@render loadingShell()}
    {:then summary}
        <BaseActivityCard
            titleKey="pages.me.donations.title"
            leftStatLabel="pages.me.donations.count"
            leftStatValue={summary?.count ?? 0}
            rightStatLabel="pages.me.donations.total"
            rightStatValue={summary?.total
                ? formatAmountWithSymbol(summary.total.amount, summary.total.currency, $locale)
                : ""}
            recentTitleKey="pages.me.donations.recent"
            illustrationPath="/images/profile/ilustration-donations.png"
            primaryActionLabel="pages.me.donations.viewAll"
            primaryActionHref={$locale === "es" ? "/me/donations" : `/${$locale}/me/donations`}
            secondaryActionLabel="pages.me.donations.certificate"
            secondaryActionHref="#"
            isEmpty={!summary || summary.count === 0}
            emptyMessageKey="pages.me.donations.empty"
            emptyCtaLabel="pages.me.donations.explore"
            emptyCtaLink={$locale === "es" ? "/discover" : `/${$locale}/discover`}
        >
            {#if summary?.recentDonations}
                {#each summary.recentDonations.slice(0, 2) as donation}
                    <li class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-black">
                            {formatAmountWithSymbol(
                                donation.amount.amount,
                                donation.amount.currency,
                                $locale,
                            )}
                        </span>
                        <span class="text-sm font-semibold text-black"> - </span>
                        {#if donation.projectSlug}
                            <a
                                href={$locale === "es"
                                    ? `/project/${donation.projectSlug}`
                                    : `/${$locale}/project/${donation.projectSlug}`}
                                class="text-secondary text-sm no-underline hover:underline focus:underline focus:outline-none"
                            >
                                {donation.projectTitle}
                            </a>
                        {:else}
                            <span class="text-tertiary text-sm italic">
                                {donation.projectTitle}
                            </span>
                        {/if}
                    </li>
                {/each}
            {/if}
        </BaseActivityCard>
    {:catch donationsError}
        {@render errorShell(donationsError)}
    {/await}
{:else}
    {@render loadingShell()}
{/if}
