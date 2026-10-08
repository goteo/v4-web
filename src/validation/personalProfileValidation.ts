import { z } from "zod";

import { isValidTaxId } from "../utils/taxId";

const zRequiredField = () =>
    z.string().refine((value) => value.trim().length > 0, {
        error: "pages.me.manage.validation.required",
    });

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
        handle: z.string().regex(/^[a-z0-9_]{4,30}$/, {
            error: "pages.me.manage.validation.handleInvalid",
        }),
        firstName: z.string(),
        lastName: z.string(),
        taxId: z.string(),
        type: z.enum(["individual", "organization"]),
        legalName: z.string(),
        businessName: z.string(),
        country: z.string().length(2).or(z.literal("")),
        subLvl1: z.string(),
        subLvl2: z.string(),
        address: z.string(),
    })
    .superRefine((data, ctx) => {
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

export type PersonalProfileForm = z.infer<typeof zPersonalProfileForm>;
