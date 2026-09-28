import { z } from "zod";

import { getSocialNetwork, SOCIAL_NETWORKS } from "../utils/socialLinks";
import { isValidTaxId } from "../utils/taxId";

const zRequiredField = () =>
    z.string().refine((value) => value.trim().length > 0, {
        error: "pages.me.manage.validation.required",
    });

export const zProfileForm = z
    .object({
        handle: z.string().regex(/^[a-z0-9_]{4,30}$/, {
            error: "pages.me.manage.validation.handleInvalid",
        }),
        avatar: z.url().optional(),
        description: z.string(),
        type: z.enum(["individual", "organization"]),
        country: z.string().length(2).or(z.literal("")),
        subLvl1: z.string(),
        subLvl2: z.string(),
        address: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        taxId: z.string(),
        legalName: z.string(),
        businessName: z.string(),
        links: z.object({
            instagram: z.string(),
            facebook: z.string(),
            x: z.string(),
            linkedin: z.string(),
        }),
    })
    .superRefine((data, ctx) => {
        // A link from another network would be shown under the wrong field once saved
        for (const network of SOCIAL_NETWORKS) {
            const url = data.links[network].trim();

            if (url && getSocialNetwork(url) !== network) {
                ctx.addIssue({
                    code: "custom",
                    path: ["links", network],
                    message: "pages.me.manage.validation.linkInvalid",
                });
            }
        }

        const taxId = data.taxId.trim();

        if (data.country && taxId && isValidTaxId(data.country, data.type, taxId) === false) {
            ctx.addIssue({
                code: "custom",
                path: ["taxId"],
                message: "pages.me.manage.validation.taxIdInvalid",
            });
        }

        if (data.type !== "organization") {
            return;
        }

        // The API requires both fields on the Organization record
        const result = z
            .object({ legalName: zRequiredField(), taxId: zRequiredField() })
            .safeParse({ legalName: data.legalName, taxId: data.taxId });

        if (!result.success) {
            for (const issue of result.error.issues) {
                ctx.addIssue({ ...issue, path: [issue.path[0]!] });
            }
        }
    });

export type ProfileForm = z.infer<typeof zProfileForm>;
