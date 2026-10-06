<script lang="ts">
    import PeerTube from "./PeerTube.svelte";
    import { t } from "../../i18n/store";
    import Spinner from "../icons/status/Spinner.svelte";
    import Loader from "../library/feedback/Loader.svelte";

    let {
        src,
        title = $t("pages.project.view.video.title"),
        thumbnails = "",
        poster = { src: "", alt: $t("pages.project.view.video.poster") },
    } = $props<{
        src: string;
        title?: string;
        thumbnails?: string;
        poster?: {
            src: string;
            alt: string;
        };
    }>();

    let showIframe = $state(false);
    let isCheckingProvider = $state(true);
    let isYouTube = $state(false);
    let isVimeo = $state(false);
    let noVideoSrc = $state(false);
    let isPeerTube = $state(false);
    let isLoading = $state(false);
    let iframeEl: HTMLIFrameElement | null = $state(null);

    let previewImage = $derived(poster.src || thumbnails);

    $effect(() => {
        noVideoSrc = !src;
        isYouTube = src.includes("youtube.com") || src.includes("youtu.be");
        isVimeo = src.includes("vimeo.com");
        isPeerTube = src.includes("/videos/watch/");
        isCheckingProvider = false;
    });

    function normalizeYouTubeUrl(original: string): string {
        try {
            const url = new URL(original);
            let videoId = "";

            if (url.hostname === "youtu.be") {
                videoId = url.pathname.slice(1);
            } else if (url.hostname.includes("youtube.com")) {
                if (url.pathname === "/watch") {
                    videoId = url.searchParams.get("v") ?? "";
                } else if (url.pathname.startsWith("/embed/")) {
                    videoId = url.pathname.split("/embed/")[1];
                }
            }

            if (!videoId) return original;

            const params = new URLSearchParams({
                autoplay: "1",
                rel: "0",
                modestbranding: "1",
            });

            return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
        } catch {
            console.warn("Invalid YouTube URL", original);
            return original;
        }
    }

    function handlePlay() {
        isLoading = true;
        showIframe = true;

        if (isYouTube) {
            src = normalizeYouTubeUrl(src);
        } else {
            const separator = src.includes("?") ? "&" : "?";
            src = `${src}${separator}autoplay=1`;
        }

        requestAnimationFrame(() => {
            iframeEl?.focus();
        });
    }
</script>

{#if isCheckingProvider}
    <div class="flex h-full items-center justify-center rounded-lg bg-gray-100">
        <Loader />
    </div>
{:else if isPeerTube}
    <div class="relative h-full w-full overflow-hidden rounded-lg">
        {#if !showIframe}
            <button
                onclick={() => {
                    showIframe = true;
                    isLoading = true;
                }}
                aria-label="Play video"
                class="group relative h-full w-full"
            >
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
        {:else}
            <div class="absolute inset-0 z-10 h-full w-full bg-black">
                {#if isLoading}
                    <div
                        class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                    >
                        <Spinner />
                    </div>
                {/if}
                <PeerTube {src} {title} onReady={() => (isLoading = false)} />
            </div>
        {/if}
    </div>
{:else if isYouTube || isVimeo}
    <div class="relative h-full w-full overflow-hidden rounded-lg">
        {#if !showIframe}
            <button
                class="group relative h-full w-full"
                onclick={handlePlay}
                aria-label="Play video"
            >
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
        {:else}
            <div class="absolute inset-0 z-10 h-full w-full bg-black">
                {#if isLoading}
                    <div class="absolute inset-0 z-20 flex items-center justify-center">
                        <Spinner />
                    </div>
                {/if}
                <iframe
                    bind:this={iframeEl}
                    {src}
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
{:else if noVideoSrc && previewImage}
    <img src={previewImage} alt={poster.alt} class="h-full w-full rounded-lg object-cover" />
{:else if noVideoSrc}
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
