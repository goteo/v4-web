import { ActionError, defineAction } from "astro:actions";
import { z } from "zod";

import { featuredUserRepository } from "../repositories/featuredUsers";
import { MAX_FEATURED_USERS } from "../utils/featuredUsers";

export const saveFeaturedUsers = defineAction({
    accept: "json",
    input: z.object({
        users: z
            .array(
                z.object({
                    userId: z.number().int().positive(),
                }),
            )
            .max(MAX_FEATURED_USERS),
    }),
    handler: async (input, context) => {
        const { session, t } = context.locals;

        if (!session?.user.roles?.includes("ROLE_ADMIN")) {
            throw new ActionError({
                code: "FORBIDDEN",
                message: t("pages.admin.comm.banners.errors.forbidden"),
            });
        }

        await featuredUserRepository.save(input.users);
    },
});
