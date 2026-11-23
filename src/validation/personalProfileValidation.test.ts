import { describe, expect, it } from "vitest";

import { zPersonalProfileForm, type PersonalProfileForm } from "./personalProfileValidation";

const profile: PersonalProfileForm = {
    handle: "ana_garcia",
    firstName: "Ana",
    lastName: "García",
    taxId: "",
    type: "individual",
    legalName: "",
    businessName: "",
    country: "ES",
    subLvl1: "",
    subLvl2: "",
    shareLocation: false,
    referralSource: "",
    taxIdType: "",
    birthYear: "",
    gender: "",
    legalForm: "",
    publicEntity: false,
};

function issuesOf(form: PersonalProfileForm) {
    const result = zPersonalProfileForm.safeParse(form);

    return result.error?.issues.map(({ path, message }) => [path[0], message]) ?? [];
}

describe("zPersonalProfileForm", () => {
    it("accepts a profile with only the handle filled in", () => {
        expect(issuesOf(profile)).toEqual([]);
    });

    it.each(["ana", "Ana_Garcia", "ana-garcia", "a".repeat(31)])(
        "rejects the handle %j",
        (handle) => {
            expect(issuesOf({ ...profile, handle })).toEqual([
                ["handle", "pages.me.manage.validation.handleInvalid"],
            ]);
        },
    );

    it("rejects a tax id that is not valid for the country", () => {
        expect(issuesOf({ ...profile, taxId: "12345678A" })).toEqual([
            ["taxId", "pages.me.manage.validation.taxIdInvalid"],
        ]);
    });

    it("does not check the tax id without a country", () => {
        expect(issuesOf({ ...profile, country: "", taxId: "12345678A" })).toEqual([]);
    });

    it("requires legal name and tax id for an organization", () => {
        expect(issuesOf({ ...profile, type: "organization" })).toEqual([
            ["legalName", "pages.me.manage.validation.required"],
            ["taxId", "pages.me.manage.validation.required"],
        ]);
    });

    it("accepts an organization with a company tax id", () => {
        expect(
            issuesOf({ ...profile, type: "organization", legalName: "Ana SL", taxId: "B12345674" }),
        ).toEqual([]);
    });

    it.each(["1899", "2100", "85"])("rejects the birth year %j", (birthYear) => {
        expect(issuesOf({ ...profile, birthYear }).map(([field]) => field)).toEqual(["birthYear"]);
    });
});
