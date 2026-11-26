import { z } from "zod";

import { taxIdIssue } from "./registerValidation";

import type { UploadedObject } from "../utils/media/objectStorage.types";

const REQUIRED = "system.validation.requiredField";

const zRequiredField = () => z.string().trim().min(1, { error: REQUIRED });

/**
 * Format and ISO 13616 mod-97 checksum, so a mistyped digit is caught too.
 */
export function isValidIban(value: string): boolean {
    const iban = value.replace(/\s/g, "").toUpperCase();

    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(iban)) {
        return false;
    }

    const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (letter) =>
        String(letter.charCodeAt(0) - 55),
    );

    let remainder = 0;

    for (const digit of digits) {
        remainder = (remainder * 10 + Number(digit)) % 97;
    }

    return remainder === 1;
}

export const zOwnerContact = z
    .object({
        id: z.string(),
        type: z.enum(["email", "phone", "text"]),
        value: z.string(),
        preferred: z.boolean(),
    })
    .superRefine((contact, ctx) => {
        const value = contact.value.trim();

        if (contact.preferred && !value) {
            ctx.addIssue({ code: "custom", path: ["value"], message: REQUIRED });
        } else if (contact.type === "email" && value && !z.email().safeParse(value).success) {
            ctx.addIssue({
                code: "custom",
                path: ["value"],
                message: "pages.project.edit.aboutYou.validation.emailInvalid",
            });
        }
    });

/**
 * Every issue carries a translation key as its message.
 */
export const zOwnerInfoForm = z
    .object({
        legalEntityType: z.enum(["individual", "organization"]),
        name: zRequiredField(),
        taxId: zRequiredField(),
        taxIdCountry: z.string().length(2),
        contacts: z.array(zOwnerContact),
        iban: zRequiredField().refine(isValidIban, {
            error: "pages.project.edit.aboutYou.paymentData.ibanInvalid",
        }),
        bankCertificate: z.array(z.custom<UploadedObject>()).min(1, { error: REQUIRED }),
        termsAccepted: z
            .boolean()
            .refine(Boolean, { error: "system.validation.project.terms.required" }),
    })
    // The tax id format depends on the issuing country and the legal entity type
    .superRefine((form, ctx) => {
        const issue = taxIdIssue(form.taxIdCountry, form.legalEntityType, form.taxId);

        if (issue) {
            ctx.addIssue({ ...issue });
        }
    });

export type OwnerContact = z.infer<typeof zOwnerContact>;
export type OwnerInfoForm = z.input<typeof zOwnerInfoForm>;
