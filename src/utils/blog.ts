import type { Locale } from "../i18n/locales";

// Kept out of repositories/blogPosts.ts: that module imports cloudflare:workers,
// which breaks hydration for any client component that imports a value from it.

export const BLOG_SECTIONS = ["news", "stories", "resources", "newsletter"] as const;
export type BlogSection = (typeof BLOG_SECTIONS)[number];

/** The locale every post is created in; list and preview show this one. */
export const BLOG_BASE_LOCALE: Locale = "es";
