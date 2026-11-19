<script lang="ts">
    import { onMount, tick, onDestroy } from "svelte";

    import "flickity/css/flickity.css";
    import type { ProjectUpdate } from "../../openapi/client/index";
    import type Flickity from "flickity";
    import type { Options } from "flickity";

    let mainCarousel: HTMLDivElement;
    let flickity: Flickity;
    let isLoaded = $state(false);

    interface Props {
        slides: ProjectUpdate[];
    }

    let { slides }: Props = $props();

    const options: Options = {
        cellAlign: "left",
        contain: true,
        pageDots: false,
        arrowShape: {
            x0: 10,
            x1: 60,
            y1: 35,
            x2: 60,
            y2: 0,
            x3: 60,
        },
    };

    async function initFlickityWhenVisible() {
        await tick(); // Espera render inicial

        const maxRetries = 20;
        let retries = 0;

        const checkReady = setInterval(() => {
            const isVisible = mainCarousel && mainCarousel.offsetParent !== null;
            const hasSize = mainCarousel?.offsetWidth > 0;

            if (isVisible && hasSize) {
                clearInterval(checkReady);
                import("flickity").then(({ default: FlickityClass }) => {
                    flickity = new FlickityClass(mainCarousel, options);
                    isLoaded = true;
                    console.log("✅ Flickity initialized with width:", mainCarousel.offsetWidth);
                });
            } else {
                console.log(
                    `⏳ Waiting... visible: ${isVisible}, width: ${mainCarousel?.offsetWidth}`,
                );
                if (++retries > maxRetries) {
                    clearInterval(checkReady);
                    console.warn("❌ Flickity not initialized: container still not ready");
                }
            }
        }, 100);
    }

    onMount(initFlickityWhenVisible);

    onDestroy(() => {
        if (flickity) {
            flickity.destroy();
        }
    });
</script>

<div class="relative h-40 w-full border">
    {#if !isLoaded}
        <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-content">Cargando...</span>
        </div>
    {/if}

    <div bind:this={mainCarousel} class="main-carousel h-full w-full">
        {#each slides as { title, subtitle, date, body, cover }}
            <div
                class="carousel-cell bg-purple-soft mr-6 flex h-full w-full flex-col items-start justify-center gap-4 rounded-xl border border-[red] p-8 shadow-[0px_1px_3px_0px_#0000001A]"
            >
                <span class="text-content text-base font-semibold">{date}</span>
                {#if cover}
                    <img src={cover} alt={title} class="mt-4 w-full rounded-lg object-cover" />
                {/if}
                <span class="text-content text-base font-semibold">{title}</span>
                <span class="text-tertiary text-3xl">{subtitle}</span>
                <p class="text-content text-sm">{body}</p>
            </div>
        {/each}
    </div>
</div>

<style>
    :global(.flickity-button-icon) {
        fill: #462949;
    }

    :global(.flickity-prev-next-button.previous),
    :global(.flickity-prev-next-button.next) {
        background: #e6e5f7;
        width: 40px;
        height: 40px;
    }

    :global(.flickity-prev-next-button.previous) {
        left: -10px;
    }

    :global(.flickity-prev-next-button.next) {
        right: -10px;
    }
</style>
