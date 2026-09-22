<script lang="ts">
    import { onMount, tick, type Snippet } from "svelte";
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import { t } from "../../../i18n/store";
    import ArrowSliderIcon from "../../icons/navigation/ArrowSliderIcon.svelte";
    import Loader from "../feedback/Loader.svelte";

    // Browser check for SSR compatibility
    const browser = typeof window !== "undefined";

    let {
        itemsPerGroup = 1,
        gap = 24,
        showDots = true,
        class: classes = "",
        mobileItemsToShow = 1,
        desktopItemsToShow = 3,
        dotsPerItem = false,
        lockItemWidth = true,
        disableDrag = false,
        navButtonTop = "50%",
        centerNavButtons = true,
        children = null,
        activeCard = $bindable(0),
        active,
        emptyMessage = $t("domain.carousel.empty"),
    }: {
        itemsPerGroup: number;
        gap: number;
        showDots: boolean;
        class?: ClassNameValue;
        mobileItemsToShow?: number;
        desktopItemsToShow?: number;
        dotsPerItem?: boolean;
        lockItemWidth?: boolean;
        disableDrag?: boolean;
        navButtonTop?: string;
        centerNavButtons?: boolean;
        children?: any;
        activeCard?: number;
        active?: Snippet;
        emptyMessage?: string;
    } = $props();

    const wrapperClasses = $derived(twMerge("relative w-full", classes));
    const navButtonClasses: ClassNameValue = $derived(
        twMerge(
            "bg-variant1 absolute z-10 hidden h-10 w-10 rounded-full p-2 shadow-md disabled:opacity-50 lg:block",
            centerNavButtons ? "-translate-y-1/2" : "",
        ),
    );

    let container: HTMLDivElement;

    let totalGroups = $state(0);
    let totalItems = $state(0);
    let isAtStart = $state(true);
    let isAtEnd = $state(false);
    let isScrollable = $state(false);
    // Starts false so the empty state is correct when there are no items; the
    // real item count is known after mount via observeVisibility.
    let hasItems = $state(false);
    // True until the real item count is measured after mount; prevents a flash
    // of the empty message while items are still loading.
    let isLoading = $state(true);

    let isDragging = $state(false);
    let startX = $state(0);
    let scrollLeft = $state(0);

    const observerMap = new Map<number, HTMLElement>();

    function getActualChildren() {
        if (!container) return [];

        let actualChildren: HTMLElement[] = [];
        const directChildren = Array.from(container.children) as HTMLElement[];

        for (const child of directChildren) {
            if (child.tagName.toLowerCase() === "astro-slot") {
                actualChildren.push(...(Array.from(child.children) as HTMLElement[]));
            } else {
                actualChildren.push(child);
            }
        }

        return actualChildren;
    }

    function getCurrentItemsToShow(): number {
        if (!browser) return desktopItemsToShow;
        return window.innerWidth >= 1024 ? desktopItemsToShow : mobileItemsToShow;
    }

    function updateItemWidths() {
        if (!browser || !container || !mounted) return;

        try {
            const actualChildren = getActualChildren();

            if (lockItemWidth) {
                const containerWidth = container.offsetWidth;

                if (containerWidth === 0) {
                    setTimeout(updateItemWidths, 50);
                    return;
                }

                const styles = getComputedStyle(container);
                const paddingLeft = parseFloat(styles.paddingLeft);
                const paddingRight = parseFloat(styles.paddingRight);
                const available = containerWidth - paddingLeft - paddingRight;

                const visibleItems = getCurrentItemsToShow();
                const childWidth = (available - gap * (visibleItems - 1)) / visibleItems;

                actualChildren.forEach((child) => {
                    child.style.minWidth = `${childWidth}px`;
                    child.style.maxWidth = `${childWidth}px`;
                    child.style.width = `${childWidth}px`;
                    child.style.flex = "0 0 auto";
                    child.style.overflow = "hidden";
                });
            } else {
                actualChildren.forEach((child) => {
                    child.style.removeProperty("min-width");
                    child.style.removeProperty("max-width");
                    child.style.removeProperty("width");
                    child.style.flex = "0 0 auto";
                    child.style.overflow = "hidden";
                });
            }

            for (const el of Array.from(container.children) as HTMLElement[]) {
                if (el.tagName.toLowerCase() === "astro-slot") {
                    el.style.minWidth = "";
                    el.style.maxWidth = "";
                    el.style.width = "";
                    el.style.flex = "";
                    el.style.display = "contents";
                }
            }
            updateNavForShort();
        } catch (error) {
            console.warn("Carousel: Error updating item widths:", error);
        }
    }

    function observeVisibility() {
        if (!browser || !container || !intersectionObs || !mounted) return;

        try {
            const actualChildren = getActualChildren();

            intersectionObs.disconnect();
            observerMap.clear();

            actualChildren.forEach((el, idx) => {
                observerMap.set(idx, el);
                intersectionObs?.observe(el);
            });

            totalGroups = Math.ceil(actualChildren.length / itemsPerGroup);
            totalItems = actualChildren.length;
            hasItems = actualChildren.length > 0;
            isLoading = false;
            updateNavForShort();
        } catch (error) {
            console.warn("Carousel: Error observing visibility:", error);
        }
    }

    function getPositionCount() {
        return dotsPerItem ? totalItems : totalGroups;
    }

    function getPositionFromItemIndex(index: number) {
        return dotsPerItem ? index : Math.floor(index / itemsPerGroup);
    }

    function getTargetItemIndex(position: number) {
        return dotsPerItem ? position : position * itemsPerGroup;
    }

    function updateNavState(position: number) {
        activeCard = position;
        isAtStart = position === 0;
        isAtEnd = position === getPositionCount() - 1;
    }

    function updateNavForShort() {
        if (!browser || !container || !mounted) return;

        try {
            isScrollable = container.scrollWidth > container.clientWidth;
            isAtStart = activeCard === 0;
            isAtEnd = !isScrollable || activeCard === getPositionCount() - 1;
        } catch (error) {
            console.warn("Carousel: Error updating navigation state:", error);
        }
    }

    async function scrollToGroup(i: number) {
        if (!browser || !container || !mounted) return;

        try {
            programmaticScroll = true;
            updateNavState(i);
            await tick();
            updateItemWidths();
            const targetItemIndex = getTargetItemIndex(i);
            const actualChildren = getActualChildren();
            const target = actualChildren[targetItemIndex];
            scrollToTarget(target, "smooth");

            if (programmaticScrollTimeout) clearTimeout(programmaticScrollTimeout);
            programmaticScrollTimeout = setTimeout(() => {
                const settledTarget = getActualChildren()[targetItemIndex];
                scrollToTarget(settledTarget, "auto");
                updateNavForShort();
                programmaticScroll = false;
            }, 360);
        } catch (error) {
            console.warn("Carousel: Error scrolling to group:", error);
            programmaticScroll = false;
        }
    }

    function scrollToTarget(target: HTMLElement | undefined, behavior: ScrollBehavior) {
        if (!container || !target) return;

        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const left = targetRect.left - containerRect.left + container.scrollLeft;

        container.scrollTo({ left, behavior });
    }

    function scroll(dir: "left" | "right") {
        const lastPosition = getPositionCount() - 1;
        const next =
            dir === "right" ? Math.min(activeCard + 1, lastPosition) : Math.max(activeCard - 1, 0);
        scrollToGroup(next);
    }

    function handleStart(x: number) {
        if (disableDrag || !browser || !container || !mounted) return;

        isDragging = true;
        startX = x - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    }

    function handleMove(x: number, ev: Event) {
        if (disableDrag || !browser || !container || !mounted || !isDragging) return;

        ev.preventDefault();
        const walk = (x - container.offsetLeft - startX) * 1.5;
        container.scrollLeft = scrollLeft - walk;
    }

    function endDrag() {
        if (disableDrag) return;

        isDragging = false;
    }

    let intersectionObs: IntersectionObserver | undefined;
    let resizeObs: ResizeObserver | undefined;
    let mutationObs: MutationObserver | undefined;
    let mounted = $state(false);
    let programmaticScroll = false;
    let programmaticScrollTimeout: ReturnType<typeof setTimeout> | undefined;

    onMount(() => {
        // Ensure we're in the browser and DOM is ready
        if (!browser || !container) return;

        const init = async () => {
            // Wait for next tick to ensure DOM is fully rendered
            await tick();

            mounted = true;

            try {
                // Create IntersectionObserver only in the browser
                intersectionObs = new IntersectionObserver(
                    (entries) => {
                        if (!mounted || programmaticScroll) return;
                        let minGroup = Infinity;
                        for (const e of entries) {
                            if (e.isIntersecting && container) {
                                for (const [index, element] of observerMap.entries()) {
                                    if (element === e.target) {
                                        minGroup = Math.min(
                                            minGroup,
                                            getPositionFromItemIndex(index),
                                        );
                                        break;
                                    }
                                }
                            }
                        }
                        if (minGroup !== Infinity && minGroup !== activeCard) {
                            updateNavState(minGroup);
                        }
                    },
                    { threshold: 0.6 },
                );

                // Initialize component after observers are created
                updateItemWidths();
                observeVisibility();

                resizeObs = new ResizeObserver(() => {
                    if (mounted && container) updateItemWidths();
                });
                resizeObs.observe(container);

                mutationObs = new MutationObserver(() => {
                    if (mounted && container) {
                        updateItemWidths();
                        observeVisibility();
                    }
                });
                mutationObs.observe(container, { childList: true, subtree: true });

                window.addEventListener("resize", updateItemWidths);
            } catch (error) {
                console.warn("Carousel: Error initializing observers:", error);
            }
        };

        init();

        return () => {
            mounted = false;
            if (intersectionObs) intersectionObs.disconnect();
            if (resizeObs) resizeObs.disconnect();
            if (mutationObs) mutationObs.disconnect();
            if (programmaticScrollTimeout) clearTimeout(programmaticScrollTimeout);
            if (browser) {
                window.removeEventListener("resize", updateItemWidths);
            }
        };
    });
</script>

<div class={wrapperClasses}>
    {#if mounted && isLoading}
        <div class="flex w-full flex-col items-center py-12">
            <Loader />
        </div>
    {:else if emptyMessage && mounted && !hasItems}
        <div class="flex w-full flex-col items-center py-12 text-center">
            <span class="text-content text-base">{emptyMessage}</span>
        </div>
    {:else}
        <button
            onclick={() => scroll("left")}
            class={twMerge(navButtonClasses, "-left-4")}
            style:top={navButtonTop}
            disabled={isAtStart}
            aria-label="Scroll left"
        >
            <ArrowSliderIcon direction="left" />
        </button>

        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
            bind:this={container}
            role="region"
            aria-label="Carousel"
            class="hide-scrollbar flex w-full scroll-smooth select-none"
            class:overflow-x-auto={!disableDrag}
            class:overflow-x-hidden={disableDrag}
            class:cursor-grab={isScrollable && !isDragging && !disableDrag}
            class:cursor-default={!isScrollable || disableDrag}
            class:cursor-grabbing={isDragging && isScrollable && !disableDrag}
            style="gap: {gap}px"
            onmousedown={(e) => handleStart(e.pageX)}
            onmousemove={(e) => handleMove(e.pageX, e)}
            onmouseup={endDrag}
            onmouseleave={endDrag}
            ontouchstart={(e) => handleStart(e.touches[0].pageX)}
            ontouchmove={(e) => handleMove(e.touches[0].pageX, e)}
            ontouchend={endDrag}
        >
            {#if children}
                {@render children()}
                {@render active?.()}
            {/if}
        </div>

        <button
            onclick={() => scroll("right")}
            class={twMerge(navButtonClasses, "-right-4")}
            style:top={navButtonTop}
            disabled={isAtEnd}
            aria-label="Scroll right"
        >
            <ArrowSliderIcon />
        </button>

        {#if showDots && getPositionCount() > 1}
            <div class="mt-4 flex justify-center gap-2">
                {#each Array(getPositionCount()) as _, i}
                    <button
                        onclick={() => scrollToGroup(i)}
                        class="h-2 w-2 rounded-full transition-all"
                        class:bg-indigo-500={i === activeCard}
                        class:bg-gray-300={i !== activeCard}
                        aria-label={`Go to group ${i + 1}`}
                    ></button>
                {/each}
            </div>
        {/if}
    {/if}
</div>

<style>
    .hide-scrollbar {
        scrollbar-width: none;
        -ms-overflow-style: none;
    }
    .hide-scrollbar::-webkit-scrollbar {
        display: none;
    }
</style>
