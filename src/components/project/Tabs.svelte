<script lang="ts">
    import { onMount } from "svelte";

    import ProjectBudget from "./ProjectBudget.svelte";
    import ProjectCommunity from "./ProjectCommunity.svelte";
    import ProjectRewards from "./ProjectRewards.svelte";
    import ProjectUpdate from "./ProjectUpdate.svelte";
    import { t } from "../../i18n/store";
    import { renderMarkdown } from "../../utils/renderMarkdown";
    import ArrowSliderIcon from "../icons/navigation/ArrowSliderIcon.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { Project, Accounting } from "../../openapi/client/index";

    let {
        lang = $bindable(),
        project = $bindable(),
        accounting,
    }: {
        lang: string;
        project: Project;
        accounting: Accounting;
    } = $props();

    let activeTab = $state("project");
    let tabsContainer: HTMLDivElement;
    let canScrollLeft = $state(false);
    let canScrollRight = $state(true);

    const tabs = [
        { id: "project", label: $t("pages.project.view.tabs.project.title") },
        { id: "rewards", label: $t("pages.project.view.tabs.rewards") },
        { id: "budget", label: $t("pages.project.view.tabs.budget.title") },
        { id: "updates", label: $t("pages.project.view.tabs.updates.title") },
        { id: "community", label: $t("pages.project.view.tabs.community.title") },
    ];

    function selectTab(tabId: string) {
        activeTab = tabId;
    }

    export function activateRewardsTab() {
        activeTab = "rewards";
    }

    function updateScrollButtons() {
        if (!tabsContainer) return;

        const scrollEnd = tabsContainer.scrollWidth - tabsContainer.clientWidth;
        const scrollLeft = Math.round(tabsContainer.scrollLeft);

        canScrollLeft = scrollLeft > 0;
        canScrollRight = scrollLeft < scrollEnd;
    }

    function scrollTabs(direction: "left" | "right") {
        if (!tabsContainer) return;
        const scrollAmount = 200;
        const targetScroll =
            direction === "left"
                ? tabsContainer.scrollLeft - scrollAmount
                : tabsContainer.scrollLeft + scrollAmount;
        tabsContainer.scrollTo({ left: targetScroll, behavior: "smooth" });
    }

    onMount(() => {
        updateScrollButtons();
        const handleScroll = () => updateScrollButtons();
        tabsContainer?.addEventListener("scroll", handleScroll);
        return () => tabsContainer?.removeEventListener("scroll", handleScroll);
    });
</script>

<div class="relative">
    <button
        onclick={() => scrollTabs("left")}
        class="bg-variant1 absolute top-5 left-0 z-10 h-8 w-8 -translate-y-1/2 rounded-r-sm p-2 shadow-md lg:hidden"
        class:opacity-50={!canScrollLeft}
        class:pointer-events-none={!canScrollLeft}
        aria-label="Scroll tabs left"
    >
        <ArrowSliderIcon direction="left" />
    </button>

    <div
        bind:this={tabsContainer}
        class="wrapper mx-8 flex scrollbar-none overflow-x-auto [-ms-overflow-style:none] lg:mx-0 lg:space-x-6 [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Project tabs"
        onscroll={updateScrollButtons}
    >
        {#each tabs as tab}
            <button
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tab-${tab.id}`}
                id={`tab-button-${tab.id}`}
                class="text-secondary lg:border-variant1 inline-flex shrink-0 items-center rounded-t-lg px-6 py-2 font-bold whitespace-nowrap transition-colors duration-100 ease-in-out lg:border-t lg:border-r lg:border-l"
                class:bg-variant1={activeTab === tab.id}
                onclick={() => selectTab(tab.id)}
            >
                {tab.label}
            </button>
        {/each}
    </div>

    <button
        onclick={() => scrollTabs("right")}
        class="bg-variant1 absolute top-5 right-0 z-10 h-8 w-8 -translate-y-1/2 rounded-l-sm p-2 shadow-md lg:hidden"
        class:opacity-50={!canScrollRight}
        class:pointer-events-none={!canScrollRight}
        aria-label="Scroll tabs right"
    >
        <ArrowSliderIcon direction="right" />
    </button>
    <div class="bg-variant1 flex w-full justify-center py-10 lg:py-20">
        <div class="wrapper flex items-center justify-center">
            {#if activeTab === "rewards"}
                <div
                    id="tab-rewards"
                    role="tabpanel"
                    aria-labelledby="tab-button-rewards"
                    class="w-full"
                >
                    <ProjectRewards bind:lang {project} {accounting} />
                </div>
            {:else if activeTab === "project"}
                <div
                    id="tab-project"
                    role="tabpanel"
                    aria-labelledby="tab-button-project"
                    class="marked-content flex w-full max-w-4xl flex-col gap-6 overflow-hidden"
                    style="overflow-wrap: break-word; word-wrap: break-word; word-break: break-word;"
                >
                    {#await renderMarkdown(project.descBrief!) then content}
                        {@html content}
                    {/await}
                    <Title level={2} variant="section" class="color-secondary font-bold">
                        {$t("pages.project.view.tabs.project.descAbout")}
                    </Title>
                    {#await renderMarkdown(project.descAbout!) then content}
                        {@html content}
                    {/await}
                    <Title level={2} variant="section" class="color-secondary font-bold">
                        {$t("pages.project.view.tabs.project.descGoal")}
                    </Title>
                    {#await renderMarkdown(project.descGoal!) then content}
                        {@html content}
                    {/await}
                    <Title level={2} variant="section" class="color-secondary font-bold">
                        {$t("pages.project.view.tabs.project.descTeam")}
                    </Title>
                    {#await renderMarkdown(project.descTeam!) then content}
                        {@html content}
                    {/await}
                </div>
            {:else if activeTab === "budget"}
                <div
                    id="tab-budget"
                    role="tabpanel"
                    aria-labelledby="tab-button-budget"
                    class="w-full"
                >
                    <ProjectBudget bind:lang {project} {accounting} />
                </div>
            {:else if activeTab === "updates"}
                <div
                    id="tab-updates"
                    role="tabpanel"
                    aria-labelledby="tab-button-updates"
                    class="w-full"
                >
                    <ProjectUpdate bind:lang {project} />
                </div>
            {:else if activeTab === "community"}
                <div
                    id="tab-community"
                    role="tabpanel"
                    aria-labelledby="tab-button-community"
                    class="w-full"
                >
                    <ProjectCommunity {project} {accounting} />
                </div>
            {/if}
        </div>
    </div>
</div>
