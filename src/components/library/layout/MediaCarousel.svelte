<!--
    Full-width media carousel: the current item is centred and the previous and next
    ones peek in at the sides, faded. Clicking a faded item or a dot moves to it.
-->
<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    interface Media {
        url: string;
        type: string;
    }

    interface Props {
        media: Media[];
        alt?: string;
        class?: ClassNameValue;
    }

    let { media, alt = "", class: classes = "" }: Props = $props();

    let track: HTMLDivElement;
    let active = $state(0);

    function goTo(index: number) {
        const item = track.children[index] as HTMLElement;

        track.scrollTo({
            left: item.offsetLeft - (track.clientWidth - item.clientWidth) / 2,
            behavior: "smooth",
        });
    }

    function onScroll() {
        const item = track.children[0] as HTMLElement;
        const step = (track.children[1] as HTMLElement).offsetLeft - item.offsetLeft;

        active = Math.round(track.scrollLeft / step);
    }
</script>

<div class={twMerge("flex w-full flex-col items-center gap-6", classes)}>
    <!-- The padding centres the first and last items; it is (width - item width) / 2. -->
    <div
        bind:this={track}
        onscroll={media.length > 1 ? onScroll : undefined}
        class="relative flex w-full snap-x snap-mandatory [scrollbar-width:none] gap-6 overflow-x-auto px-[calc((100%-min(100%,898px))/2)] [&::-webkit-scrollbar]:hidden"
    >
        {#each media as item, index (item.url)}
            {@const isActive = index === active}
            <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
            <div
                class={twMerge(
                    "h-100 w-full shrink-0 snap-center overflow-hidden rounded-2xl transition-opacity duration-300",
                    isActive ? "opacity-100" : "cursor-pointer opacity-24",
                )}
                onclick={isActive ? undefined : () => goTo(index)}
            >
                {#if item.type.startsWith("video/")}
                    <!-- svelte-ignore a11y_media_has_caption -->
                    <video src={item.url} controls={isActive} class="size-full object-cover"
                    ></video>
                {:else}
                    <img src={item.url} {alt} class="size-full object-cover" />
                {/if}
            </div>
        {/each}
    </div>

    {#if media.length > 1}
        <div
            class="bg-secondary/24 flex h-10 items-center gap-2 rounded-full px-6 backdrop-blur-sm"
        >
            {#each media as item, index (item.url)}
                <button
                    type="button"
                    onclick={() => goTo(index)}
                    aria-label={`${index + 1} / ${media.length}`}
                    aria-current={index === active}
                    class={twMerge(
                        "h-2 cursor-pointer rounded-full transition-all duration-300",
                        index === active ? "bg-secondary w-4" : "w-2 bg-white",
                    )}
                ></button>
            {/each}
        </div>
    {/if}
</div>
