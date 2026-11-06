import { ActionError, defineAction } from "astro:actions";
import { z } from "zod";

import { proposedCampaignsRepository } from "../repositories/proposedCampaigns";

export const saveProposedCampaigns = defineAction({
    accept: "json",
    input: z.object({
        "ending-soon": z.array(z.number().int().positive()),
        "most-successful": z.array(z.number().int().positive()),
    }),
    handler: async (input, context) => {
        const { session, t } = context.locals;

        if (!session?.user.roles?.includes("ROLE_ADMIN")) {
            throw new ActionError({
                code: "FORBIDDEN",
                message: t("pages.admin.comm.banners.errors.forbidden"),
            });
        }

        await proposedCampaignsRepository.save({
            "ending-soon": input["ending-soon"],
            "most-successful": input["most-successful"],
        });
    },
});
