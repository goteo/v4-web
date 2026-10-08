import { z } from "zod";

import { SOCIAL_NETWORKS, toSocialLinkUrl } from "../utils/socialLinks";

export const zProfileForm = z
    .object({
        avatar: z.url().optional(),
        description: z.string(),
        links: z.object({
            instagram: z.string(),
            facebook: z.string(),
            x: z.string(),
            linkedin: z.string(),
        }),
    })
    .superRefine((data, ctx) => {
        // A username or a link of this network; one from another network would land in the wrong field
        for (const network of SOCIAL_NETWORKS) {
            const url = data.links[network].trim();

            if (url && !toSocialLinkUrl(network, url)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["links", network],
                    message: "pages.me.manage.validation.linkInvalid",
                });
            }
        }
    });

export type ProfileForm = z.infer<typeof zProfileForm>;
