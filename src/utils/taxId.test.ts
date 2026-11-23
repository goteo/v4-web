import { describe, expect, it } from "vitest";

import { isValidTaxId } from "./taxId";

describe("isValidTaxId", () => {
    it.each([
        ["ES", "individual", "12345678Z"],
        ["ES", "individual", "X1234567L"],
        ["ES", "organization", "B12345674"],
        ["ES", "organization", "12345678Z"],
        ["FR", "organization", "732829320"],
    ] as const)("accepts %s %s %s", (country, type, value) => {
        expect(isValidTaxId(country, type, value)).toBe(true);
    });

    it.each([
        ["ES", "individual", "12345678A"],
        ["ES", "individual", "1234"],
        ["ES", "organization", "not-a-tax-id"],
        ["FR", "organization", "732829321"],
    ] as const)("rejects %s %s %s", (country, type, value) => {
        expect(isValidTaxId(country, type, value)).toBe(false);
    });

    it("rejects a company id for an individual", () => {
        expect(isValidTaxId("ES", "individual", "B12345674")).toBe(false);
    });

    it("ignores the case of the country code", () => {
        expect(isValidTaxId("es", "individual", "12345678Z")).toBe(true);
    });

    it("cannot check countries without a validator", () => {
        expect(isValidTaxId("AR", "individual", "anything")).toBeUndefined();
        expect(isValidTaxId("JP", "individual", "anything")).toBeUndefined();
    });
});
