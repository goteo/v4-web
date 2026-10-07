import { ActionError, defineAction } from "astro:actions";
import { z } from "zod";

import { labels } from "../i18n/locales";
import { blogPostRepository } from "../repositories/blogPosts";
import { BLOG_BASE_LOCALE, BLOG_SECTIONS } from "../utils/blog";

import type { Locale } from "../i18n/locales";
import type { ActionAPIContext } from "astro:actions";

// Astro turns any empty form field into null unless the validator is optional,
// so every field the admin may leave blank has to be declared as such.
const optionalText = z.string().optional();

const translations = z
    .string()
    .transform((value) => JSON.parse(value))
    .pipe(
        z.partialRecord(
            z.enum(Object.keys(labels) as [Locale, ...Locale[]]),
            z.object({
                title: z.string().trim().min(1, "system.constraint.text.notEmpty"),
                subtitle: z.string().nullable(),
                content: z.string(),
            }),
        ),
    )
    .refine((value) => value[BLOG_BASE_LOCALE], "system.constraint.text.notEmpty");

const flag = z.enum(["0", "1"]).transform((value) => value === "1");

const VIDEO_HOSTS = ["youtube.com", "www.youtube.com", "youtu.be", "vimeo.com", "www.vimeo.com"];

const videoUrl = z
    .url("pages.admin.comm.blog.errors.invalidVideoUrl")
    .refine(
        (url) => VIDEO_HOSTS.includes(new URL(url).hostname),
        "pages.admin.comm.blog.errors.invalidVideoUrl",
    )
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
        translations,
        author: optionalText,
        publishedAt: z.coerce.date().optional(),
        headerUrl: optionalText,
        headerType: optionalText,
        videoUrl,
        section: z.enum(BLOG_SECTIONS),
        allowComments: flag,
        published: flag,
    }),
    handler: async (input, context) => {
        assertAdmin(context);

        const id = await blogPostRepository.save(
            input.id ?? null,
            {
                author: input.author || null,
                published: input.published,
                publishedAt: input.publishedAt ?? null,
                headerUrl: input.headerUrl || null,
                headerType: input.headerType || null,
                videoUrl: input.videoUrl || null,
                section: input.section,
                allowComments: input.allowComments,
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
