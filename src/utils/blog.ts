import type { BlogPost, BlogPostTexts } from "../repositories/blogPosts";

// Kept out of repositories/blogPosts.ts: that module imports cloudflare:workers,
// which breaks hydration for any client component that imports a value from it.

export const BLOG_SECTIONS = ["news", "stories", "resources", "newsletter"] as const;
export type BlogSection = (typeof BLOG_SECTIONS)[number];

/**
 * A post's texts in one language: its own ones, with that language's translations on top.
 * @param post The post with its translations
 * @param locale The language to show
 * @returns The texts, in the base language wherever the translation lacks one
 */
export function textsIn(post: BlogPost, locale: string): BlogPostTexts {
    const { title, subtitle, content } = post;

    return { title, subtitle, content, ...post.translations[locale] };
}

/**
 * The embeddable player URL of a YouTube or Vimeo link; the admin form accepts no other.
 * @param link A watch, short or embed link
 * @returns The player URL, or null when the link is not a recognisable video
 */
export function videoEmbedUrl(link: string): string | null {
    try {
        const url = new URL(link);
        const host = url.hostname.replace(/^www\./, "");
        const [first, second] = url.pathname.split("/").filter(Boolean);

        if (host === "youtu.be" && first) {
            return `https://www.youtube.com/embed/${first}`;
        }

        if (host === "youtube.com") {
            const id =
                url.searchParams.get("v") ??
                (["embed", "shorts", "live"].includes(first) ? second : null);

            return id ? `https://www.youtube.com/embed/${id}` : null;
        }

        // vimeo.com/123, vimeo.com/channels/x/123 or player.vimeo.com/video/123
        const vimeoId = url.pathname.match(/\/(\d+)(?:\/|$)/)?.[1];

        if ((host === "vimeo.com" || host === "player.vimeo.com") && vimeoId) {
            return `https://player.vimeo.com/video/${vimeoId}`;
        }

        return null;
    } catch {
        return null;
    }
}
