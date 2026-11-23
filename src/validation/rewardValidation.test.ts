import { describe, expect, it } from "vitest";

import { zCreateRewardForm } from "./rewardValidation";

const reward = {
    project: "/v4/projects/1",
    title: "Camiseta",
    description: "Una camiseta del proyecto",
    money: { amount: 2000, currency: "EUR" },
    hasShipping: false,
    isFinite: true,
    unitsTotal: 10,
};

function fieldsWithIssues(form: object) {
    return zCreateRewardForm.safeParse(form).error?.issues.map(({ path }) => path.join(".")) ?? [];
}

describe("zCreateRewardForm", () => {
    it("accepts a complete reward", () => {
        expect(fieldsWithIssues(reward)).toEqual([]);
    });

    it.each(["title", "description"])("requires %s", (field) => {
        expect(fieldsWithIssues({ ...reward, [field]: "" })).toEqual([field]);
    });

    it.each([0, -100, 10.5])("rejects the minimum amount %d", (amount) => {
        expect(fieldsWithIssues({ ...reward, money: { amount, currency: "EUR" } })).toEqual([
            "money.amount",
        ]);
    });

    it("rejects fractional units", () => {
        expect(fieldsWithIssues({ ...reward, unitsTotal: 2.5 })).toEqual(["unitsTotal"]);
    });

    it("accepts unlimited units", () => {
        expect(fieldsWithIssues({ ...reward, isFinite: false, unitsTotal: null })).toEqual([]);
    });
});
