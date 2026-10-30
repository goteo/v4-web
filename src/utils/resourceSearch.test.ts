import { describe, expect, it, vi } from "vitest";

import { debounce } from "./debounce";
import {
    combineSearchers,
    createLocalSearcher,
    createSearcher,
    groupResults,
} from "./resourceSearch";

const toItem = (name: string) => ({ id: name, value: name, label: name });

describe("createSearcher", () => {
    it("resolves empty without fetching below minChars", async () => {
        const fetch = vi.fn();
        const search = createSearcher({ fetch, map: toItem, minChars: 3 });

        await expect(search("ab")).resolves.toEqual([]);
        expect(fetch).not.toHaveBeenCalled();
    });

    it("fetches with the trimmed query and tags results with the group", async () => {
        const fetch = vi.fn().mockResolvedValue(["Madrid"]);
        const search = createSearcher({ fetch, map: toItem, group: "projects" });

        await expect(search("  mad  ")).resolves.toEqual([
            { id: "Madrid", value: "Madrid", label: "Madrid", group: "projects" },
        ]);
        expect(fetch).toHaveBeenCalledWith("mad", undefined);
    });
});

describe("createLocalSearcher", () => {
    it("filters accent-insensitively and fetches the collection only once", async () => {
        const fetchAll = vi.fn().mockResolvedValue(["Cádiz", "Madrid"]);
        const search = createLocalSearcher({ fetchAll, map: toItem });

        await expect(search("cadi")).resolves.toEqual([toItem("Cádiz")]);
        await expect(search("mad")).resolves.toEqual([toItem("Madrid")]);
        expect(fetchAll).toHaveBeenCalledTimes(1);
    });

    it("retries the collection fetch after a failure", async () => {
        const fetchAll = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(["a"]);
        const search = createLocalSearcher({ fetchAll, map: toItem });

        await expect(search("a")).rejects.toThrow("boom");
        await expect(search("a")).resolves.toEqual([toItem("a")]);
        expect(fetchAll).toHaveBeenCalledTimes(2);
    });
});

describe("combineSearchers", () => {
    it("flattens results and preserves each item's group", async () => {
        const search = combineSearchers(
            createSearcher({ fetch: async () => ["p"], map: toItem, group: "projects" }),
            createSearcher({ fetch: async () => ["u"], map: toItem, group: "users" }),
        );

        await expect(search("query")).resolves.toEqual([
            { ...toItem("p"), group: "projects" },
            { ...toItem("u"), group: "users" },
        ]);
    });
});

describe("groupResults", () => {
    it("buckets in encounter order and puts ungrouped items under an empty key", () => {
        expect(
            groupResults([
                { ...toItem("a"), group: "x" },
                toItem("b"),
                { ...toItem("c"), group: "x" },
            ]),
        ).toEqual([
            [
                "x",
                [
                    { ...toItem("a"), group: "x" },
                    { ...toItem("c"), group: "x" },
                ],
            ],
            ["", [toItem("b")]],
        ]);
    });
});

describe("debounce", () => {
    it("fires once for a burst, with the last arguments", () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const debounced = debounce(fn, 100);

        debounced("a");
        debounced("b");
        debounced("c");
        vi.advanceTimersByTime(100);

        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith("c");
        vi.useRealTimers();
    });
});
