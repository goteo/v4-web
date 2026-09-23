import { ActionError, defineAction } from "astro:actions";
import { z } from "zod";

import { homeHeroRepository } from "../repositories/homeHero";
import { startOfDay } from "../utils/dates";

// Astro turns any empty form field into null unless the validator is optional,
// so every field the admin may leave blank has to be declared as such.
const optionalText = z.string().optional();

const optionalUrl = z
    .union([z.url(), z.string().startsWith("/")], "pages.admin.home.hero.errors.invalidUrl")
    .optional();

const scheduledDate = z.coerce
    .date()
    .refine((date) => date >= startOfDay(new Date()), "system.constraint.date.greaterThan");

export const createHomeHero = defineAction({
    accept: "form",
    input: z.object({
        title: z.string("system.constraint.text.notEmpty").min(1),
        content: z.string("system.constraint.text.notEmpty").min(1),
        primaryCtaText: optionalText,
        primaryCtaLink: optionalUrl,
        secondaryCtaText: optionalText,
        secondaryCtaLink: optionalUrl,
        mediaUrl: optionalUrl,
        mediaType: optionalText,
        startsAt: scheduledDate,
    }),
    handler: async (input, context) => {
        const { session, t } = context.locals;

        // Actions are posted to /_actions/*, which the /admin firewall rule does not
        // match, so the role has to be checked here.
        if (!session?.user.roles?.includes("ROLE_ADMIN")) {
            throw new ActionError({
                code: "FORBIDDEN",
                message: t("pages.admin.home.hero.errors.forbidden"),
            });
        }

        await homeHeroRepository.create({
            title: input.title,
            content: input.content,
            primaryCtaText: input.primaryCtaText || null,
            primaryCtaLink: input.primaryCtaLink || null,
            secondaryCtaText: input.secondaryCtaText || null,
            secondaryCtaLink: input.secondaryCtaLink || null,
            mediaUrl: input.mediaUrl || null,
            mediaType: input.mediaType || null,
            startsAt: input.startsAt,
            dateCreated: new Date(),
        });
    },
});

export const deleteHomeHero = defineAction({
    accept: "form",
    input: z.object({
        id: z.coerce.number().int().positive(),
    }),
    handler: async (input, context) => {
        const { session, t } = context.locals;

        // Actions are posted to /_actions/*, which the /admin firewall rule does not
        // match, so the role has to be checked here.
        if (!session?.user.roles?.includes("ROLE_ADMIN")) {
            throw new ActionError({
                code: "FORBIDDEN",
                message: t("pages.admin.home.hero.errors.forbidden"),
            });
        }

        await homeHeroRepository.delete(input.id);
    },
});
