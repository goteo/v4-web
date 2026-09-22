<script lang="ts">
    import BaseActivityCard from "./BaseActivityCard.svelte";
    import { formatAmountWithSymbol } from "../../utils/currencies";

    import type { ActivityData } from "../../types/me-page";

    interface Props {
        /**
         * Current language locale
         */
        lang: string;

        /**
         * Optional activity data for filled state
         * If undefined/null, shows empty state
         */
        data?: ActivityData;
    }

    let { lang, data }: Props = $props();

    // Determine if this card has data
    const hasData = $derived(!!(data?.projects && data.projects.count > 0));

    // Get projects data
    const projectsData = $derived(data?.projects);

    // Formatted total raised
    const formattedTotal = $derived(
        projectsData?.totalRaised
            ? formatAmountWithSymbol(
                  projectsData.totalRaised.amount,
                  projectsData.totalRaised.currency,
                  lang,
              )
            : "",
    );
</script>

<BaseActivityCard
    titleKey="pages.me.projects.title"
    leftStatLabel="pages.me.projects.count"
    leftStatValue={projectsData?.count ?? 0}
    rightStatLabel="pages.me.projects.raised"
    rightStatValue={formattedTotal}
    recentTitleKey="pages.me.projects.recent"
    illustrationPath="/images/profile/ilustration-project.png"
    primaryActionLabel="pages.me.projects.viewAll"
    primaryActionHref="/me#owned-projects"
    secondaryActionLabel="pages.me.projects.createNew"
    secondaryActionHref="/create/project"
    isEmpty={!hasData}
    emptyMessageKey="pages.me.projects.empty"
    emptyCtaLabel="pages.me.projects.create"
    emptyCtaLink="/create/project"
>
    {#if projectsData?.recentProjects}
        {#each projectsData.recentProjects.slice(0, 2) as project}
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
