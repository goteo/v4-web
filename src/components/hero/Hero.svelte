<script lang="ts">
    import Grid from "../library/layout/Grid.svelte";

    import type { HomeHeroRecord } from "../../repositories/homeHero";

    interface Props {
        hero?: HomeHeroRecord | null;
        content?: string | null;
    }

    let { hero, content }: Props = $props();

    let isVideo = $derived(hero?.mediaType?.startsWith("video/") ?? false);
</script>

<section class="wrapper hero-section flex">
    <div class="container mx-auto py-16 lg:py-24">
        <Grid class="grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <!-- Hero Content -->
            <div class="space-y-8">
                <h1 class="text-secondary text-4xl leading-tight font-bold lg:text-5xl xl:text-6xl">
                    {hero?.title}
                </h1>
                <div class="marked-content space-y-1 text-lg leading-relaxed text-neutral-500">
                    {@html content}
                </div>

                <!-- CTA Buttons -->
                <div class="flex flex-col gap-4 sm:flex-row">
                    {#if hero?.primaryCtaText && hero.primaryCtaLink}
                        <a
                            href={hero.primaryCtaLink}
                            class="text-secondary bg-purple-soft inline-block rounded-full border-0 px-8 py-4 text-center font-semibold whitespace-nowrap transition-all duration-200 hover:opacity-90"
                        >
                            {hero.primaryCtaText}
                        </a>
                    {/if}
                    {#if hero?.secondaryCtaText && hero.secondaryCtaLink}
                        <a
                            href={hero.secondaryCtaLink}
                            class="bg-primary text-secondary inline-block rounded-full border-0 px-8 py-4 text-center font-semibold whitespace-nowrap transition-all duration-200 hover:opacity-90"
                        >
                            {hero.secondaryCtaText}
                        </a>
                    {/if}
                </div>
            </div>

            <!-- Hero Illustration -->
            <div class="relative flex justify-center lg:justify-end">
                <div class="relative aspect-668/510 w-full max-w-lg">
                    {#if hero?.mediaUrl && isVideo}
                        <video
                            src={hero.mediaUrl}
                            autoplay
                            muted
                            loop
                            playsinline
                            class="h-full w-full scale-120 object-contain"
                        ></video>
                    {:else}
                        <img
                            src={hero?.mediaUrl}
                            alt={hero?.title || "Hero Illustration"}
                            class="h-full w-full scale-120 object-contain"
                        />
                    {/if}
                </div>
            </div>
        </Grid>
    </div>
</section>
