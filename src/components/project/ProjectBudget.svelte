<script lang="ts">
    import { Modal } from "flowbite-svelte";
    import { onDestroy, onMount } from "svelte";

    import PublicBudgetCard from "./PublicBudgetCard.svelte";
    import ResumeBudget from "./ResumeBudget.svelte";
    import { t } from "../../i18n/store";
    import { apiProjectBudgetItemsGetCollection } from "../../openapi/client/index";
    import { formatCurrency } from "../../utils/currencies";
    import { renderMarkdown } from "../../utils/renderMarkdown";
    import Carousel from "../library/layout/Carousel.svelte";

    import type { Project, ProjectBudgetItem, Accounting } from "../../openapi/client/index";

    const typeBudget: Record<ProjectBudgetItem["type"], string> = {
        task: "bg-variant2",
        infrastructure: "bg-secondary",
        material: "bg-tertiary",
    };

    let {
        lang = $bindable(),
        project,
        accounting,
    }: {
        lang: string;
        project: Project;
        accounting: Accounting;
    } = $props();

    let projectsBudgetItems: ProjectBudgetItem[] = $state([]);
    let minimumItems: ProjectBudgetItem[] = $state([]);
    let optimumItems: ProjectBudgetItem[] = $state([]);
    let itemsPerGroup = $state(3);
    let openModal = $state(false);
    let selectedBudgetItem: ProjectBudgetItem | null = $state(null);
    let renderedDescription = $state("");

    $effect(() => {
        if (selectedBudgetItem?.description) {
            renderMarkdown(selectedBudgetItem.description).then((html) => {
                renderedDescription = html;
            });
        } else {
            renderedDescription = "";
        }
    });

    $effect(() => {
        const projectId = project.id!.toString();
        apiProjectBudgetItemsGetCollection({
            query: { project: projectId },
            headers: { "Accept-Language": lang },
        }).then((data) => {
            projectsBudgetItems = data.data!;
            minimumItems = projectsBudgetItems.filter((item) => item.deadline === "minimum");
            optimumItems = projectsBudgetItems.filter((item) => item.deadline === "optimum");
        });
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

        itemsPerGroup = isMobile ? 1 : 3;
    }

    onMount(() => {
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
    <div>
        <ResumeBudget {project} {accounting} />
    </div>
    <div class="flex flex-col gap-10">
        <div class="flex flex-col gap-6">
            <span class="text-secondary text-3xl font-bold">
                {$t("pages.project.view.tabs.budget.minimum")}:
                {formatCurrency(
                    project.budget?.minimum?.money?.amount,
                    project.budget?.minimum?.money?.currency,
                )}
            </span>
            <Carousel gap={16} showDots={true} {itemsPerGroup}>
                {#if minimumItems.length === 0}
                    <div
                        class="flex h-35 w-full items-center justify-center rounded bg-indigo-100 font-bold"
                    >
                        {$t("pages.project.view.tabs.updates.content.empty")}
                    </div>
                {/if}

                {#each minimumItems as item}
                    <PublicBudgetCard
                        {item}
                        bind:openModal
                        bind:selectedItem={selectedBudgetItem}
                    />
                {/each}
            </Carousel>
        </div>
        <div class="flex flex-col gap-6">
            <div></div>
            <span class="text-secondary text-3xl font-bold">
                {$t("pages.project.view.tabs.budget.optimal")}:

                {formatCurrency(
                    project.budget?.optimum?.money?.amount,
                    project.budget?.optimum?.money?.currency,
                )}
            </span>
            <Carousel gap={16} showDots={true} {itemsPerGroup}>
                {#if optimumItems.length === 0}
                    <div
                        class="flex h-35 w-full items-center justify-center rounded bg-indigo-100 font-bold"
                    >
                        {$t("pages.project.view.tabs.updates.content.empty")}
                    </div>
                {/if}

                {#each optimumItems as item}
                    <PublicBudgetCard
                        {item}
                        bind:openModal
                        bind:selectedItem={selectedBudgetItem}
                    />
                {/each}
            </Carousel>
        </div>
    </div>
</div>

<Modal
    bind:open={openModal}
    closeBtnClass="top-7 end-7 bg-transparent text-secondary hover:bg-transparent hover:text-secondary rounded-4xl hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 w-full max-w-118.75 -translate-x-1/2 -translate-y-1/2 divide-y-0 bg-transparent backdrop:backdrop-blur-[5px]"
    bodyClass="p-0"
>
    {#if selectedBudgetItem}
        <div
            class="flex cursor-pointer flex-col gap-4 rounded-3xl bg-white p-8 shadow-lg"
            onclick={(e) => e.stopPropagation()}
            role="presentation"
        >
            <div class="flex flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-2">
                    <div
                        class="inline-block h-2.5 w-5 rounded-lg {typeBudget[
                            selectedBudgetItem.type as ProjectBudgetItem['type']
                        ]}"
                    ></div>
                    <span class="text-content text-sm">
                        {$t(`domain.project.budget.type.${selectedBudgetItem.type}`)}
                    </span>
                </div>
                <div class="flex flex-col items-end">
                    <p class="text-2xl font-bold text-black">
                        {formatCurrency(
                            selectedBudgetItem.money.amount,
                            selectedBudgetItem.money.currency,
                        )}
                    </p>
                </div>
            </div>
            <div class="text-2xl font-bold text-black">
                {selectedBudgetItem.title}
            </div>
            <div class="text-content prose prose-sm text-sm">
                {@html renderedDescription}
            </div>
        </div>
    {/if}
</Modal>
