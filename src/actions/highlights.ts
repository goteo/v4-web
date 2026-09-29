import { ActionError, defineAction } from "astro:actions";
import { z } from "zod";

import { highlightRepository } from "../repositories/highlights";

export const saveHighlights = defineAction({
    accept: "json",
    input: z.object({
        type: z.string().min(1),
        layout: z.string().min(1),
        slots: z.array(z.number().int().positive()),
    }),
    handler: async (input, context) => {
        const { session, t } = context.locals;

        if (!session?.user.roles?.includes("ROLE_ADMIN")) {
            throw new ActionError({
                code: "FORBIDDEN",
                message: t("pages.admin.comm.banners.errors.forbidden"),
            });
        }

        await highlightRepository.save(input.type, input.layout, input.slots);
    },
});

export const deleteHighlights = defineAction({
    accept: "json",
    input: z.object({}),
    handler: async (_input, context) => {
        const { session, t } = context.locals;

        if (!session?.user.roles?.includes("ROLE_ADMIN")) {
            throw new ActionError({
                code: "FORBIDDEN",
                message: t("pages.admin.comm.banners.errors.forbidden"),
            });
        }

        await highlightRepository.delete();
    },
});
