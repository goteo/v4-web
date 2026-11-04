/**
 * Campaign videos come from wherever the author hosts them: a YouTube, Vimeo or
 * PeerTube link, or a file of their own. The API stores the link as it was
 * given, so the embeddable player URL has to be worked out here — the page URL
 * of most providers refuses to be framed (`X-Frame-Options`).
 */

export type VideoProvider = "youtube" | "vimeo" | "peertube" | "file";

export interface VideoSource {
    /** Where the video is hosted. */
    provider: VideoProvider;
    /** The URL to put in the iframe (or the file URL for the `file` provider). */
    embedUrl: string;
    /** The same URL, ready to play on its own. */
    autoplayUrl: string;
}

const YOUTUBE_HOSTS = ["youtube.com", "youtu.be"];
const VIMEO_HOSTS = ["vimeo.com", "player.vimeo.com"];
const VIDEO_FILE_EXTENSIONS = ["mp4", "webm", "ogv", "ogg", "mov", "m4v"];

/**
 * The host of a URL, without the `www.`, `m.` and `music.` prefixes the
 * providers use for their mobile and music domains.
 * @param url A parsed URL
 * @returns The bare host name
 */
function bareHost(url: URL): string {
    return url.hostname.replace(/^(www|m|music)\./, "");
}

/**
 * The identifier of a YouTube video, whatever shape the link has.
 * @param url A parsed YouTube URL
 * @returns The video id, or null when the link carries none
 */
function youtubeId(url: URL): string | null {
    const host = bareHost(url);
    const segments = url.pathname.split("/").filter(Boolean);

    if (host === "youtu.be") {
        return segments[0] ?? null;
    }

    if (!YOUTUBE_HOSTS.includes(host)) {
        return null;
    }

    if (segments[0] === "watch") {
        return url.searchParams.get("v");
    }

    if (["embed", "shorts", "live", "v"].includes(segments[0])) {
        return segments[1] ?? null;
    }

    return null;
}

/**
 * The identifier of a Vimeo video and the hash that hides it, when it has one.
 * @param url A parsed Vimeo URL
 * @returns The video id and its optional privacy hash
 */
function vimeoId(url: URL): { id: string; hash: string | null } | null {
    if (!VIMEO_HOSTS.includes(bareHost(url))) {
        return null;
    }

    const segments = url.pathname.split("/").filter(Boolean);

    // vimeo.com/album/1/video/2, vimeo.com/groups/1/videos/2, player.vimeo.com/video/2
    const videoAt = segments.findIndex((segment) => segment === "video" || segment === "videos");

    if (videoAt >= 0) {
        const id = segments[videoAt + 1];

        if (id && /^\d+$/.test(id)) {
            return { id, hash: null };
        }
    }

    // vimeo.com/123/abcdef — the last segment is the privacy hash.
    const last = segments[segments.length - 1];
    const previous = segments[segments.length - 2];

    if (last && previous && !/^\d+$/.test(last) && /^\d+$/.test(previous)) {
        return { id: previous, hash: last };
    }

    // vimeo.com/123, vimeo.com/channels/staffpicks/123
    const id = segments.find((segment) => /^\d+$/.test(segment));

    return id ? { id, hash: null } : null;
}

/**
 * The identifier of a PeerTube video, in whatever shape the instance links it.
 * @param url A parsed URL
 * @returns The video id, or null when the link is not a PeerTube one
 */
function peerTubeId(url: URL): string | null {
    const segments = url.pathname.split("/").filter(Boolean);

    if (segments[0] === "w" && segments[1]) {
        return segments[1];
    }

    if (segments[0] === "videos" && ["watch", "embed"].includes(segments[1]) && segments[2]) {
        return segments[2];
    }

    return null;
}

/**
 * Whether a URL points to a video file of its own rather than to a provider.
 * @param url A parsed URL
 * @returns Whether the file is a playable video
 */
function isVideoFile(url: URL): boolean {
    const extension = url.pathname.split(".").pop()?.toLowerCase() ?? "";

    return VIDEO_FILE_EXTENSIONS.includes(extension);
}

/**
 * The playable version of a video link: the provider's player URL, or the file
 * itself when the video is hosted on its own.
 * @param src The link the author pasted
 * @returns The video source, or null when the link is not a video we can play
 */
export function detectVideo(src: string): VideoSource | null {
    let url: URL;

    try {
        url = new URL(src);
    } catch {
        return null;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        return null;
    }

    const youtube = youtubeId(url);

    if (youtube) {
        const embedUrl = `https://www.youtube.com/embed/${youtube}`;

        return {
            provider: "youtube",
            embedUrl,
            autoplayUrl: `${embedUrl}?autoplay=1&rel=0&modestbranding=1`,
        };
    }

    const vimeo = vimeoId(url);

    if (vimeo) {
        const embedUrl = `https://player.vimeo.com/video/${vimeo.id}`;

        return {
            provider: "vimeo",
            embedUrl,
            autoplayUrl: `${embedUrl}?${vimeo.hash ? `h=${vimeo.hash}&` : ""}autoplay=1`,
        };
    }

    const peerTube = peerTubeId(url);

    if (peerTube) {
        return {
            provider: "peertube",
            embedUrl: `${url.origin}/videos/embed/${peerTube}`,
            autoplayUrl: `${url.origin}/videos/embed/${peerTube}`,
        };
    }

    if (isVideoFile(url)) {
        return { provider: "file", embedUrl: url.href, autoplayUrl: url.href };
    }

    return null;
}

/**
 * The embeddable player URL of a YouTube or Vimeo link; the admin form accepts no other.
 * @param link A watch, short or embed link
 * @returns The player URL, or null when the link is not a recognisable video
 */
export function videoEmbedUrl(link: string): string | null {
    const source = detectVideo(link);

    if (!source || source.provider === "file" || source.provider === "peertube") {
        return null;
    }

    return source.embedUrl;
}
