import { describe, expect, it } from "vitest";

import { extractId } from "./extractId";

describe("extractId", () => {
    it.each([
        ["/v4/projects/42", "42"],
        ["/v4/projects/my-slug", "my-slug"],
        ["/v4/projects/2024-fest", "2024-fest"],
        ["/v4/users/pep", "pep"],
        ["/v4/users/42/person", "42"],
        ["/v4/match_formulas/linear", "linear"],
        ["42", "42"],
    ])("%s → %s", (iri, id) => {
        expect(extractId(iri)).toBe(id);
    });

    it("returns null when empty", () => {
        expect(extractId(undefined)).toBeNull();
        expect(extractId("")).toBeNull();
    });
});
