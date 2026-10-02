import { z } from "zod";

import { SOCIAL_NETWORKS, toSocialLinkUrl } from "../utils/socialLinks";
import { isValidTaxId } from "../utils/taxId";

/**
 * The private half of the promoter profile: the `Person` record (names and tax id) plus the
 * `Territory` living on the `User`. Every field here is only exposed by the API to the owner and
 * to platform admins, which is what separates this form from the public one.
 *
 * `avatar`, `description` and `links` live on the `User` and are shared with the public section,
 * but the pieces that edit them (image card, bio card and social networks) live here too, so they
 * travel with the rest of the form.
 *
 * `type` is not editable: it decides where the tax id belongs, and changing the profile kind is
 * done in the public section.
 */
export const zPersonalProfileForm = z
    .object({
        avatar: z.url().optional(),
        description: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        taxId: z.string(),
        country: z.string().length(2).or(z.literal("")),
        subLvl1: z.string(),
        subLvl2: z.string(),
        address: z.string(),
        type: z.enum(["individual", "organization"]),
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

        // For organizations the tax id belongs to the legal entity, which the public section owns
        if (data.type === "organization") {
            return;
        }

        const taxId = data.taxId.trim();

        if (data.country && taxId && isValidTaxId(data.country, data.type, taxId) === false) {
            ctx.addIssue({
                code: "custom",
                path: ["taxId"],
                message: "pages.me.manage.validation.taxIdInvalid",
            });
        }
    });

export type PersonalProfileForm = z.infer<typeof zPersonalProfileForm>;
