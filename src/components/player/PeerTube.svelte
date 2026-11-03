<script lang="ts">
    import { onMount } from "svelte";

    import { t } from "../../i18n/store";

    interface Props {
        src: string;
        title?: string;
        onReady?: () => void;
    }

    let { src, title = $t("pages.project.view.video.title"), onReady = () => {} }: Props = $props();

    let iframe: HTMLIFrameElement;
    let player: any = $state(null);
    let isReady = $state(false);

    function makeEmbedSrc(url: string): string {
        const base = url.replace("/videos/watch/", "/videos/embed/").split("?")[0];
        const params = new URLSearchParams({
            api: "1",
            autoplay: "1",
            muted: "0",
            controlBar: "1",
            peertubeLink: "0",
        });
        return `${base}?${params.toString()}`;
    }

    function loadScript(src: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) return resolve();

            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load script: " + src));
            document.head.appendChild(script);
        });
    }

    onMount(async () => {
        if (!iframe) return;

        iframe.src = makeEmbedSrc(src);

        try {
            await loadScript("https://unpkg.com/@peertube/embed-api/build/player.min.js");

            const PeerTubePlayer = (window as any).PeerTubePlayer;
            if (PeerTubePlayer) {
                player = new PeerTubePlayer(iframe);
                await player.ready;
                isReady = true;
                onReady();
            } else {
                console.error("PeerTubePlayer is not available.");
            }
        } catch (err) {
            console.error("Error loading PeerTube script:", err);
        }
    });
</script>

<div class="relative h-full w-full">
    <iframe
        bind:this={iframe}
        {title}
        class={`absolute inset-0 h-full w-full transition-opacity duration-500 ${isReady ? "opacity-100" : "opacity-0"}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowfullscreen
        loading="lazy"
    ></iframe>
</div>
