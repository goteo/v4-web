import { ActionError, defineAction } from "astro:actions";
import { z } from "zod";

import { blogPostRepository } from "../repositories/blogPosts";
import { BLOG_SECTIONS, videoEmbedUrl } from "../utils/blog";

import type { ActionAPIContext } from "astro:actions";

// Astro turns any empty form field into null unless the validator is optional,
// so every field the admin may leave blank has to be declared as such.
const optionalText = z.string().optional();

// As in the hero, a post may be translated into any language, not only the UI locales.
export const languageCode = z.string().regex(/^[a-z]{2,8}([-_][a-z0-9]{2,8})*$/);

const title = z.string().trim().min(1, "system.constraint.text.notEmpty");

// The texts of every language other than `language`, as JSON keyed by locale.
const translations = z
    .string()
    .transform((value) => JSON.parse(value))
    .pipe(
        z.record(
            languageCode,
            z.object({ title, subtitle: z.string().optional(), content: z.string().optional() }),
        ),
    );

// Uploads are absolute URLs; site assets such as /images/... are paths.
const mediaUrl = z.string().refine((url) => url.startsWith("/") || URL.canParse(url));

const headerMedia = z
    .string()
    .transform((value) => JSON.parse(value))
    .pipe(z.array(z.object({ url: mediaUrl, type: z.string() })));

const flag = z.enum(["0", "1"]).transform((value) => value === "1");

// Only links the post page can turn into a player.
const videoUrl = z
    .string()
    .refine((url) => videoEmbedUrl(url) !== null, "pages.admin.comm.blog.errors.invalidVideoUrl")
    .optional();

/**
 * Actions are posted to /_actions/*, which the /admin firewall rule does not
 * match, so the role has to be checked here.
 * @param context The action context
 */
function assertAdmin({ locals: { session, t } }: ActionAPIContext) {
    if (!session?.user.roles?.includes("ROLE_ADMIN")) {
        throw new ActionError({
            code: "FORBIDDEN",
            message: t("pages.admin.comm.blog.errors.forbidden"),
        });
    }
}

export const saveBlogPost = defineAction({
    accept: "form",
    input: z.object({
        id: z.coerce.number().int().positive().optional(),
        language: languageCode,
        title,
        subtitle: optionalText,
        content: optionalText,
        translations,
        author: optionalText,
        publishedAt: z.coerce.date().optional(),
        headerMedia,
        videoUrl,
        section: z.enum(BLOG_SECTIONS),
        published: flag,
    }),
    handler: async (input, context) => {
        assertAdmin(context);

        const id = await blogPostRepository.save(
            input.id ?? null,
            {
                language: input.language,
                title: input.title,
                subtitle: input.subtitle || null,
                content: input.content ?? "",
                author: input.author || null,
                published: input.published,
                publishedAt: input.publishedAt ?? null,
                headerMedia: input.headerMedia,
                videoUrl: input.videoUrl || null,
                section: input.section,
            },
            input.translations,
        );

        return { id };
    },
});

export const setBlogPostPublished = defineAction({
    accept: "form",
    input: z.object({
        id: z.coerce.number().int().positive(),
        published: flag,
    }),
    handler: async (input, context) => {
        assertAdmin(context);

        await blogPostRepository.setPublished(input.id, input.published);
    },
});
