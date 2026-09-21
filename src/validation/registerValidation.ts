import { z } from "zod";

import { zUserUserSignupDto } from "../openapi/client/zod.gen";
import { getDefaultCountry } from "../utils/consts";
import { isValidTaxId } from "../utils/taxId";

const zRequiredField = () =>
    z.string().refine((value) => value.trim().length > 0, {
        error: "pages.checkout.register.form.validation.required",
    });

function taxIdIssue(
    country: string,
    type: "individual" | "organization",
    value: string,
): z.core.$ZodIssueCustom | undefined {
    if (value.trim() && isValidTaxId(country, type, value) === false) {
        return {
            code: "custom",
            path: ["taxId"],
            message: "pages.checkout.register.form.validation.taxIdInvalid",
        };
    }
}

const zOrganizationFields = z.object({
    legalName: zRequiredField(),
    taxId: zRequiredField(),
});

export const zRegisterForm = zUserUserSignupDto
    .omit({ email: true })
    .extend({
        identifier: z.email({
            error: "pages.checkout.register.form.validation.emailInvalid",
        }),
        firstname: zRequiredField(),
        lastname: zRequiredField(),
        taxId: z.string().optional(),
        taxIdCountry: z.string().length(2).default(getDefaultCountry()),
        legalName: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        const issue = taxIdIssue(data.taxIdCountry, data.type, data.taxId ?? "");

        if (issue) {
            ctx.addIssue({ ...issue });
        }

        if (data.type !== "organization") {
            return;
        }

        const result = zOrganizationFields.safeParse({
            legalName: data.legalName,
            taxId: data.taxId,
        });

        if (!result.success) {
            for (const issue of result.error.issues) {
                ctx.addIssue({
                    ...issue,
                    path: [issue.path[0]!],
                });
            }
        }
    });
