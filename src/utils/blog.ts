import type { BlogPost, BlogPostTexts } from "../repositories/blogPosts";

// Kept out of repositories/blogPosts.ts: that module imports cloudflare:workers,
// which breaks hydration for any client component that imports a value from it.

export { videoEmbedUrl } from "./video";

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
 * Plain-text summary of a Markdown body, for cards that cannot render it.
 * @param content The Markdown content
 * @param maxLength Maximum number of characters before truncating
 * @returns The text without Markdown syntax, truncated when needed
 */
export function excerptFromMarkdown(content: string, maxLength = 180): string {
    const text = content
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/[#>*_`~]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}
