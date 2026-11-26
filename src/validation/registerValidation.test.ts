import { describe, expect, it } from "vitest";

import { zRegisterForm } from "./registerValidation";

const individual = {
    type: "individual",
    identifier: "ana@example.org",
    password: "12345678",
    firstname: "Ana",
    lastname: "García",
    taxIdCountry: "ES",
} as const;

const organization = {
    ...individual,
    type: "organization",
    legalName: "Ana SL",
    taxId: "B12345674",
} as const;

function issuesOf(form: object) {
    const result = zRegisterForm.safeParse(form);

    return result.error?.issues.map(({ path, message }) => [path[0], message]) ?? [];
}

describe("zRegisterForm", () => {
    it("accepts a complete individual", () => {
        expect(issuesOf(individual)).toEqual([]);
    });

    it("accepts a complete organization", () => {
        expect(issuesOf(organization)).toEqual([]);
    });

    it.each(["not-an-email", "ana@", "@example.org", ""])("rejects the email %j", (identifier) => {
        expect(issuesOf({ ...individual, identifier })).toEqual([
            ["identifier", "pages.checkout.register.form.validation.emailInvalid"],
        ]);
    });

    it("rejects a password shorter than 8 characters", () => {
        const issues = zRegisterForm.safeParse({ ...individual, password: "1234567" }).error
            ?.issues;

        expect(issues).toMatchObject([{ path: ["password"], code: "too_small" }]);
    });

    it.each(["firstname", "lastname"])("requires %s", (field) => {
        expect(issuesOf({ ...individual, [field]: "  " })).toEqual([
            [field, "pages.checkout.register.form.validation.required"],
        ]);
    });

    it("rejects a tax id that is not valid for the country", () => {
        expect(issuesOf({ ...individual, taxId: "12345678A" })).toEqual([
            ["taxId", "pages.checkout.register.form.validation.taxIdInvalid"],
        ]);
    });

    it("requires legal name and tax id for an organization", () => {
        expect(issuesOf({ ...organization, legalName: "", taxId: "" })).toEqual([
            ["legalName", "pages.checkout.register.form.validation.required"],
            ["taxId", "pages.checkout.register.form.validation.required"],
        ]);
    });
});
