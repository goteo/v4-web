<script lang="ts">
    import { Modal } from "flowbite-svelte";
    import { onDestroy, onMount } from "svelte";

    import PlatformUpdateCard from "./PlatformUpdateCard.svelte";
    import ProjectUpdateCard, { type ProjectUpdateCardType } from "./ProjectUpdateCard.svelte";
    import { t } from "../../i18n/store";
    import { apiProjectUpdatesGetCollection } from "../../openapi/client/index";
    import { renderMarkdown } from "../../utils/renderMarkdown";
    import ShareIcon from "../icons/actions/Share.svelte";
    import AlertIcon from "../icons/status/AlertIcon.svelte";
    import Button from "../library/buttons/Button.svelte";
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

    $effect(() => {
        apiProjectUpdatesGetCollection({
            query: { project: projectId, "order[date]": "desc" },
            headers: { "Accept-Language": lang },
        }).then((data) => {
            projectUpdates = data.data!;
        });
    });

    let itemsPerGroup = $state(2);
    let openModal = $state(false);
    let selected: ProjectUpdate | null = $state(null);
    let activeCard: number = $state(0);

    $effect(() => {
        if (openModal) cleanCloseButton();
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

    function cleanCloseButton() {
        const closeBtn = document.querySelector('button[aria-label="Close"]');
        if (!closeBtn) return;

        closeBtn.removeAttribute("aria-label");
        closeBtn.classList.remove("sr-only");

        closeBtn.querySelectorAll("span").forEach((el) => {
            if (el.textContent?.trim() === "Close") {
                el.remove();
            }
        });
    }

    function shouldShowHeader(dateStr?: string): boolean {
        if (!dateStr) return false;

        const now = new Date();
        const date = new Date(dateStr);
        const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        return diffHours <= 72;
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
        {#if projectUpdates.length === 0}
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

    <Modal
        bind:open={openModal}
        closeBtnClass="top-7 end-7 bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
        class="backdrop:bg-overlay fixed top-1/2 left-1/2 w-full max-w-200 -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-lg backdrop:backdrop-blur-[5px]"
    >
        {#if selected}
            {#if shouldShowHeader(selected.date)}
                <div class="text-secondary flex items-center gap-2 text-base font-bold">
                    <AlertIcon />
                    {$t("pages.project.view.tabs.updates.modalTitle")}
                </div>
            {/if}
            <Title level={3} variant="section" color="secondary">
                {selected?.title}
            </Title>
            <div class="marked-content text-content flex flex-col gap-4">
                {#await renderMarkdown(selected.body) then content}
                    {@html content}
                {/await}
            </div>

            <div class="flex w-full justify-end">
                <Button>
                    <ShareIcon />
                    {$t("pages.project.view.tabs.updates.content.btn.share")}
                </Button>
            </div>
        {/if}
    </Modal>
</div>
