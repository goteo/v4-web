<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import ProjectCommunityAnonymous from "./ProjectCommunityAnonymous.svelte";
    import ProjectCommunityMatchfunding from "./ProjectCommunityMatchfunding.svelte";
    import ProjectCommunityMessage from "./ProjectCommunityMessage.svelte";
    import { t } from "../../i18n/store";
    import { apiProjectSupportsGetCollection } from "../../openapi/client/index";
    import { formatCurrency } from "../../utils/currencies";
    import Goteo from "../icons/Goteo.svelte";
    import ActionableButton from "../library/buttons/ActionableButton.svelte";
    import Loader from "../library/feedback/Loader.svelte";
    import Grid from "../library/layout/Grid.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { Accounting, Project, ProjectSupport } from "../../openapi/client/index";

    let {
        project,
        accounting,
    }: {
        project: Project;
        accounting: Accounting;
    } = $props();

    const projectId = $derived(project.id?.toString());

    let supportItems = $state<ProjectSupport[]>([]);
    let matchfundingItems = $state<ProjectSupport[]>([]);

    let selectedProjectSupport: ProjectSupport | null = $state(null);

    let isLoaded = $state(false);
    let openModal = $state(false);
    let hasMore = $state(false);
    let currentPage = $state(1);

    const PAGE_SIZE = 30;

    async function fetchPage(page: number): Promise<ProjectSupport[]> {
        const { data } = await apiProjectSupportsGetCollection({
            query: {
                project: projectId,
                anonymous: false,
                matchfunding: false,
                page,
                itemsPerPage: PAGE_SIZE,
            },
        });

        const items = (data as ProjectSupport[]) ?? [];
        hasMore = items.length === PAGE_SIZE;

        return items;
    }

    const hasMatchfunding = $derived(matchfundingItems.length > 0);
    const isSingleMatchfunding = $derived(matchfundingItems.length === 1);

    // Without matchers the anonymous card shares the grid: hold back the last loaded
    // item while more pages remain so rows stay full.
    const visibleDefaultItems = $derived(
        hasMatchfunding || !hasMore ? supportItems : supportItems.slice(0, -1),
    );

    $effect(() => {
        Promise.all([
            apiProjectSupportsGetCollection({
                query: { project: projectId, matchfunding: true },
            }),
            fetchPage(1),
        ])
            .then(([{ data: matchers }, items]) => {
                matchfundingItems = (matchers as ProjectSupport[]) ?? [];
                supportItems = items;
            })
            .finally(() => {
                isLoaded = true;
            });
    });

    async function loadMore() {
        const nextPage = currentPage + 1;
        const supports = await fetchPage(nextPage);
        supportItems = [...supportItems, ...supports];
        currentPage = nextPage;
    }
</script>

<div class="flex flex-col gap-10">
    {#if !isLoaded}
        <div class="flex items-center justify-center">
            <Loader />
        </div>
    {:else}
        <Title level={2} variant="headline" color="secondary" truncate={2} class="flex max-w-2xl">
            {$t("pages.project.view.tabs.community.content.title")}
        </Title>
        <div class="flex flex-col gap-6">
            {#if hasMatchfunding}
                <Grid
                    class={`grid-cols-1 gap-6 ${isSingleMatchfunding ? "md:grid-cols-2 lg:grid-cols-2" : "md:grid-cols-3"}`}
                >
                    {#each matchfundingItems as item (item.id)}
                        <ProjectCommunityMatchfunding
                            {item}
                            bind:openModal
                            bind:selectedProjectSupport
                        />
                    {/each}
                    <ProjectCommunityAnonymous {project} currency={accounting.balance?.currency!} />
                </Grid>
            {/if}

            <Grid class="grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {#if !hasMatchfunding}
                    <ProjectCommunityAnonymous {project} currency={accounting.balance?.currency!} />
                {/if}
                {#each visibleDefaultItems as item (item.id)}
                    <ProjectCommunityMessage {item} bind:openModal bind:selectedProjectSupport />
                {/each}
            </Grid>

            {#if hasMore}
                <div class="flex w-full justify-center">
                    <ActionableButton action={loadMore} autoreset={0} class="w-32">
                        {$t("pages.project.view.tabs.community.loadMore")}
                    </ActionableButton>
                </div>
            {/if}
        </div>
    {/if}
</div>

<Modal
    bind:open={openModal}
    closeBtnClass="top-7 end-7 bg-transparent text-secondary hover:bg-transparent hover:text-secondary  rounded-4xl hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 w-full max-w-118.75 -translate-x-1/2 -translate-y-1/2 divide-y-0 bg-transparent backdrop:backdrop-blur-[5px]"
    bodyClass="p-0"
>
    {#if selectedProjectSupport}
        <div
            class="flex cursor-pointer flex-col gap-4 rounded-3xl bg-white p-8 shadow-lg"
            onclick={(e) => e.stopPropagation()}
            role="presentation"
        >
            <div class="flex flex-row items-center justify-between gap-4">
                {#if selectedProjectSupport.displayImage}
                    <img
                        src={selectedProjectSupport.displayImage}
                        alt={selectedProjectSupport.displayName}
                        class="h-16 w-16 shrink-0 rounded-xl object-cover"
                    />
                {:else}
                    <Goteo />
                {/if}
                <div class="flex flex-col items-end">
                    <div class="font-bold text-black">
                        {$t("pages.project.view.tabs.community.contribution")}
                    </div>
                    <p class="text-2xl font-bold text-black">
                        {formatCurrency(
                            selectedProjectSupport.money?.amount ?? 0,
                            selectedProjectSupport.money?.currency ?? "undefined",
                        )}
                    </p>
                </div>
            </div>
            <div class="text-2xl font-bold text-black">
                {selectedProjectSupport.displayName}
            </div>
            <div class="text-content text-sm">
                {selectedProjectSupport.message}
            </div>
        </div>
    {/if}
</Modal>
