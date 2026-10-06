import { ActionError, defineAction } from "astro:actions";
import { z } from "zod";

import { bannerRepository } from "../repositories/banners";

export const createBanner = defineAction({
    accept: "form",
    input: z.object({
        title: z.string("system.constraint.text.notEmpty").min(1),
        content: z.string("system.constraint.text.notEmpty").min(1),
        ctaText: z.string("system.constraint.text.notEmpty").min(1),
        ctaLink: z.url("pages.admin.comm.banners.errors.invalidUrl"),
        startsAt: z.coerce.date().min(new Date(), "system.constraint.date.greaterThan"),
        endsAt: z.coerce.date().min(new Date(), "system.constraint.date.greaterThan"),
    }),
    handler: async (input, context) => {
        const { session, t } = context.locals;

        // Actions are posted to /_actions/*, which the /admin firewall rule does not
        // match, so the role has to be checked here.
        if (!session?.user.roles?.includes("ROLE_ADMIN")) {
            throw new ActionError({
                code: "FORBIDDEN",
                message: t("pages.admin.comm.banners.errors.forbidden"),
            });
        }

        if (input.endsAt < input.startsAt) {
            throw new ActionError({
                code: "BAD_REQUEST",
                message: t("pages.admin.comm.banners.errors.invalidDateRange"),
            });
        }

        await bannerRepository.create({ ...input, dateCreated: new Date() });
    },
});

export const deleteBanner = defineAction({
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
                message: t("pages.admin.comm.banners.errors.forbidden"),
            });
        }

        await bannerRepository.delete(input.id);
    },
});
