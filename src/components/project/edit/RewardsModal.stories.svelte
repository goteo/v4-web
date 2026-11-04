<script module lang="ts">
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import { expect, userEvent, waitFor } from "storybook/test";
    import { readable } from "svelte/store";

    import RewardsModal from "./RewardsModal.svelte";

    import type { ProjectDraftStore } from "../../../stores/drafts/draftsStore";

    const draft = readable({
        actual: { id: 1 },
        lang: "es",
        languages: ["es", "en"],
    }) as unknown as ProjectDraftStore;

    const reward = {
        id: 7,
        project: "/v4/projects/1",
        title: "Camiseta",
        description: "De algodón",
        money: { amount: 1000, currency: "EUR" },
        hasShipping: false,
        isFinite: false,
        unitsTotal: 0,
        locales: ["es", "ca"],
    };

    /** Records every request, keyed by method and content language, and answers with `reward`. */
    function fakeApi({ failReads = false } = {}) {
        const writes: string[] = [];

        window.fetch = async (input) => {
            const request = input as Request;
            const lang = request.headers.get("Accept-Language");

            if (request.method === "GET") {
                return Response.json(
                    { ...reward, title: `Camiseta ${lang}` },
                    { status: failReads ? 500 : 200 },
                );
            }

            writes.push(`${request.method} ${request.headers.get("Content-Language")}`);

            return Response.json({ ...reward, id: 8 });
        };

        return writes;
    }

    const save = () => document.querySelector<HTMLButtonElement>("dialog button[type=submit]")!;
    const title = () => document.querySelector<HTMLInputElement>("dialog form input")!;
    const description = () => document.querySelector("dialog [contenteditable]")!;
    const button = (text: string) =>
        [...document.querySelectorAll("dialog button")].find(
            (button) => button.textContent?.trim() === text,
        )!;

    async function pickLanguage(language: string) {
        await userEvent.click(document.querySelector("dialog [aria-haspopup]")!);
        await userEvent.click(button(language));
    }

    const { Story } = defineMeta({
        component: RewardsModal,
        title: "Project/Edit/RewardsModal",
        tags: ["autodocs"],
        args: { open: true, draft },
    });
</script>

<Story
    name="New reward"
    play={async () => {
        const writes = fakeApi();

        await userEvent.type(title(), "Camiseta");
        await userEvent.click(description());
        await userEvent.keyboard("De algodón");
        await userEvent.type(document.querySelectorAll("dialog form input")[1], "10");
        await userEvent.click(save());

        // "en" was left blank, so it stays untranslated.
        await waitFor(() => expect(writes).toEqual(["POST es"]));
    }}
/>

<Story
    name="Existing reward"
    args={{ reward }}
    play={async () => {
        const writes = fakeApi();

        // Project languages join the ones the reward already has, each one with its own text.
        await waitFor(() => expect(title().value).toBe("Camiseta es"));

        await pickLanguage("English");
        await expect(title().value).toBe("");

        await userEvent.type(title(), "T-shirt");
        await userEvent.click(save());

        // Half a translation doesn't save, and leaves the user on the language to complete.
        await expect(title().value).toBe("T-shirt");
        await expect(writes).toEqual([]);

        await userEvent.click(description());
        await userEvent.keyboard("Cotton");

        await pickLanguage("Català");
        await expect(title().value).toBe("Camiseta ca");

        // Emptying a language is how its translation is removed.
        await userEvent.clear(title());
        await userEvent.click(description());
        await userEvent.keyboard("{Control>}a{/Control}{Backspace}");

        await userEvent.click(save());

        await waitFor(() => expect(writes).toEqual(["PATCH es", "PATCH en", "DELETE ca"]));
    }}
/>

<Story
    name="Translations failed to load"
    args={{ reward }}
    play={async () => {
        fakeApi({ failReads: true });

        // Saving would otherwise drop the translations it couldn't read.
        await waitFor(() => expect(save().disabled).toBe(true));
    }}
/>
