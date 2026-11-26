<script lang="ts">
    import { onDestroy, onMount } from "svelte";

    import PlatformUpdateCard from "./PlatformUpdateCard.svelte";
    import ProjectUpdateCard, { type ProjectUpdateCardType } from "./ProjectUpdateCard.svelte";
    import ProjectUpdateModal from "./ProjectUpdateModal.svelte";
    import { t } from "../../i18n/store";
    import { apiProjectUpdatesGetCollection } from "../../openapi/client/index";
    import Loader from "../library/feedback/Loader.svelte";
    import Carousel from "../library/layout/Carousel.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { Project, ProjectUpdate } from "../../openapi/client/index";

    let {
        lang = $bindable(),
        project,
    }: {
        lang: string;
        project: Project;
    } = $props();

    const projectId = $derived(project.id!.toString());

    let projectUpdates: ProjectUpdate[] = $state([]);
    let isLoading = $state(true);

    $effect(() => {
        apiProjectUpdatesGetCollection({
            query: { project: projectId, "order[date]": "desc" },
            headers: { "Accept-Language": lang },
        })
            .then((data) => {
                projectUpdates = data.data ?? [];
            })
            .finally(() => {
                isLoading = false;
            });
    });

    let itemsPerGroup = $state(2);
    let openModal = $state(false);
    let selected: ProjectUpdate | null = $state(null);
    let activeCard: number = $state(0);

    $effect(() => {
        if (!openModal) selected = null;
    });

    function updateItemsPerGroup() {
        // Check for mobile devices using multiple criteria
        const isMobileScreen = window.innerWidth <= 768;
        const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
        const isMobileUserAgent =
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent,
            );

        // Consider it mobile if it's a small screen OR (touch device AND mobile user agent)
        const isMobile = isMobileScreen || (isTouchDevice && isMobileUserAgent);

        itemsPerGroup = isMobile ? 1 : 2;
    }

    function getCardType(index: number): ProjectUpdateCardType {
        if (itemsPerGroup === 1) return "mobile";

        return index === activeCard ? "expanded" : "contracted";
    }

    onMount(async () => {
        updateItemsPerGroup();

        window.addEventListener("resize", updateItemsPerGroup);
    });

    onDestroy(() => {
        return () => {
            window.removeEventListener("resize", updateItemsPerGroup);
        };
    });
</script>

<div class="flex flex-col gap-10">
    <Title level={2} variant="headline" color="secondary" truncate={2} class="flex max-w-2xl">
        {$t("pages.project.view.tabs.updates.content.title")}
    </Title>
    <Carousel
        bind:activeCard
        gap={24}
        showDots={true}
        {itemsPerGroup}
        dotsPerItem={true}
        lockItemWidth={itemsPerGroup === 1}
        disableDrag={itemsPerGroup !== 1}
        centerNavButtons={true}
        mobileItemsToShow={1}
        desktopItemsToShow={2}
    >
        {#if isLoading}
            <Loader />
        {:else if projectUpdates.length === 0}
            <div
                class="flex h-35 w-full items-center justify-center rounded bg-indigo-100 font-bold"
            >
                {$t("pages.project.view.tabs.updates.content.empty")}
            </div>
        {/if}

        {#each projectUpdates as update, i}
            {#if !update.author}
                <PlatformUpdateCard {update} type={getCardType(i)} isActive={i === activeCard} />
            {:else}
                <ProjectUpdateCard
                    {update}
                    type={getCardType(i)}
                    isActive={i === activeCard}
                    onClick={(): void => {
                        selected = update;
                        openModal = true;
                    }}
                />
            {/if}
        {/each}
    </Carousel>

    <ProjectUpdateModal bind:open={openModal} update={selected} />
</div>
