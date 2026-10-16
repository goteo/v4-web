import { ActionError, defineAction } from "astro:actions";
import { z } from "zod";

import { languageCode } from "./blog";
import { bannerRepository } from "../repositories/banners";
import { formatDate } from "../utils/dates";

import type { ActionAPIContext } from "astro:actions";

const text = z.string("system.constraint.text.notEmpty").trim().min(1);
const ctaLink = z.url("pages.admin.comm.banners.errors.invalidUrl");

// The texts of every language other than `language`, as JSON keyed by locale.
const translations = z
    .string()
    .transform((value) => JSON.parse(value))
    .pipe(z.record(languageCode, z.object({ title: text, content: text, ctaText: text, ctaLink })));

// Dates come from the admin's timezone, so "today" may still be yesterday in UTC.
const ONE_DAY = 24 * 60 * 60 * 1000;

/**
 * Actions are posted to /_actions/*, which the /admin firewall rule does not
 * match, so the role has to be checked here.
 * @param context The action context
 */
function assertAdmin({ locals: { session, t } }: ActionAPIContext) {
    if (!session?.user.roles?.includes("ROLE_ADMIN")) {
        throw new ActionError({
            code: "FORBIDDEN",
            message: t("pages.admin.comm.banners.errors.forbidden"),
        });
    }
}

export const saveBanner = defineAction({
    accept: "form",
    input: z.object({
        id: z.coerce.number().int().positive().optional(),
        language: languageCode,
        title: text,
        content: text,
        ctaText: text,
        ctaLink,
        translations,
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date(),
    }),
    handler: async ({ id, translations, ...banner }, context) => {
        assertAdmin(context);

        const { t, lang } = context.locals;

        // A running banner keeps its past start date when edited.
        if (!id && banner.startsAt.getTime() < Date.now() - ONE_DAY) {
            throw new ActionError({
                code: "BAD_REQUEST",
                message: t("system.constraint.date.greaterThan", {
                    date: formatDate(new Date(), lang),
                }),
            });
        }

        if (banner.endsAt < banner.startsAt) {
            throw new ActionError({
                code: "BAD_REQUEST",
                message: t("pages.admin.comm.banners.errors.invalidDateRange"),
            });
        }

        return { id: await bannerRepository.save(id ?? null, banner, translations) };
    },
});

export const deleteBanner = defineAction({
    accept: "form",
    input: z.object({
        id: z.coerce.number().int().positive(),
    }),
    handler: async (input, context) => {
        assertAdmin(context);

        await bannerRepository.delete(input.id);
    },
});
