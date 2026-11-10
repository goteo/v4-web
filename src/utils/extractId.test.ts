import { describe, expect, it } from "vitest";

import { extractId } from "./extractId";
import * as operationPaths from "../openapi/client/operation-paths.gen";

// Every API item route ("/v4/users/{id}/person", ...) — new resources are covered after `pnpm sdk`.
const itemRoutes = [...new Set(Object.values(operationPaths))].filter((path) => path.includes("{"));

const sampleIds = ["42", "my-slug", "2024-fest", "pep_villalonga"];

describe("extractId", () => {
    it("knows the API item routes", () => {
        expect(itemRoutes.length).toBeGreaterThan(0);
    });

    describe.each(itemRoutes)("%s", (route) => {
        it.each(sampleIds)("extracts %s", (id) => {
            expect(extractId(route.replace(/\{[^}]+\}/, id))).toBe(id);
        });
    });

    it.each([
        ["/v4/projects/42", "42"],
        ["/v4/projects/my-slug", "my-slug"],
        ["/v4/users/pep", "pep"],
        ["/v4/users/42/person", "42"],
        ["/v4/users/42/organization", "42"],
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
