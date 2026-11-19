<script lang="ts">
    import PeerTube from "./PeerTube.svelte";
    import { t } from "../../i18n/store";
    import { detectVideo } from "../../utils/video";
    import Spinner from "../icons/status/Spinner.svelte";

    interface Props {
        src: string;
        title?: string;
        thumbnail?: string;
        poster?: {
            src: string;
            alt: string;
        };
    }

    let {
        src,
        title = $t("pages.project.view.video.title"),
        thumbnail = "",
        poster = { src: "", alt: $t("pages.project.view.video.poster") },
    }: Props = $props();

    let showIframe = $state(false);
    let isLoading = $state(false);
    let iframeEl: HTMLIFrameElement | null = $state(null);

    let previewImage = $derived(poster.src || thumbnail);

    // The link the author pasted points to a page, not to a player: the API
    // stores it as it was given, so the embeddable URL is worked out here.
    let source = $derived(detectVideo(src));
    let embedSrc = $derived(showIframe && source ? source.autoplayUrl : "");

    function handlePlay() {
        if (!source) return;

        isLoading = true;
        showIframe = true;

        requestAnimationFrame(() => {
            iframeEl?.focus();
        });
    }
</script>

{#snippet posterButton()}
    <button class="group relative h-full w-full" onclick={handlePlay} aria-label="Play video">
        <img
            src={previewImage}
            alt={poster.alt}
            class="h-full w-full object-cover"
            loading="lazy"
        />
        <div
            class="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors duration-300 group-hover:bg-black/20"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-16 w-16 text-white opacity-90"
                fill="currentColor"
                viewBox="0 0 24 24"
            >
                <path d="M8 5v14l11-7z" />
            </svg>
        </div>
    </button>
{/snippet}

{#if source?.provider === "peertube"}
    <div class="relative h-full w-full overflow-hidden rounded-lg">
        {#if !showIframe}
            {@render posterButton()}
        {:else}
            <div class="absolute inset-0 z-10 h-full w-full bg-black">
                {#if isLoading}
                    <div
                        class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                    >
                        <Spinner />
                    </div>
                {/if}
                <PeerTube src={source.embedUrl} {title} onReady={() => (isLoading = false)} />
            </div>
        {/if}
    </div>
{:else if source?.provider === "youtube" || source?.provider === "vimeo"}
    <div class="relative h-full w-full overflow-hidden rounded-lg">
        {#if !showIframe}
            {@render posterButton()}
        {:else}
            <div class="absolute inset-0 z-10 h-full w-full bg-black">
                {#if isLoading}
                    <div
                        class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                    >
                        <Spinner />
                    </div>
                {/if}
                <iframe
                    bind:this={iframeEl}
                    src={embedSrc}
                    {title}
                    class={`absolute inset-0 h-full w-full transition-opacity duration-500 ${isLoading ? "opacity-0" : "opacity-100"}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowfullscreen
                    loading="lazy"
                    onload={() => (isLoading = false)}
                ></iframe>
            </div>
        {/if}
    </div>
{:else if source?.provider === "file"}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video
        src={source.embedUrl}
        poster={previewImage || undefined}
        controls
        playsinline
        class="h-full w-full rounded-lg bg-black object-contain"
    ></video>
{:else if !src && previewImage}
    <img src={previewImage} alt={poster.alt} class="h-full w-full rounded-lg object-cover" />
{:else if !src}
    <div
        class="flex h-full items-center justify-center rounded-lg bg-gray-100 p-4 text-sm text-gray-600"
    >
        {$t("pages.project.view.video.not-found")}
    </div>
{:else}
    <div
        class="flex h-full items-center justify-center rounded-lg bg-gray-100 p-4 text-sm text-gray-600"
    >
        {$t("pages.project.view.video.not-supported")}
    </div>
{/if}
