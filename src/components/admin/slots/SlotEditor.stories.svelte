<script module lang="ts">
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import SlotEditor from "./SlotEditor.svelte";

    import type { SlotContent, SlotLabels } from "./slots.types";

    /** Inline avatars keep the story self-contained (no network requests). */
    function avatar(initials: string, color: string): string {
        const svg =
            `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">` +
            `<rect width="96" height="96" fill="${color}"/>` +
            `<text x="50%" y="50%" dy="0.35em" text-anchor="middle" ` +
            `font-family="sans-serif" font-size="36" fill="#ffffff">${initials}</text></svg>`;

        return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }

    const users: SlotContent<number>[] = [
        { value: 1, label: "Ada Lovelace", description: "@ada", imageUrl: avatar("AL", "#7C3AED") },
        { value: 2, label: "Alan Turing", description: "@alan", imageUrl: avatar("AT", "#0EA5E9") },
        {
            value: 3,
            label: "Grace Hopper",
            description: "@grace",
            imageUrl: avatar("GH", "#F59E0B"),
        },
        {
            value: 4,
            label: "Katherine Johnson",
            description: "@katherine",
            imageUrl: avatar("KJ", "#10B981"),
        },
        {
            value: 5,
            label: "Margaret Hamilton",
            description: "@margaret",
            imageUrl: avatar("MH", "#EF4444"),
        },
    ];

    const labels: SlotLabels = {
        title: "Featured users",
        description: "Choose the people highlighted on the home page.",
        selectionTitle: "Highlighted slots",
        empty: "No one selected yet",
        add: "Add user",
        change: "Change",
        modalTitle: "Pick a user",
        modalDescription: "Search by name or handle and confirm to fill the slot.",
        searchPlaceholder: "Search users",
        submit: "Confirm",
    };

    function search(query: string): Promise<SlotContent<number>[]> {
        const term = query.trim().toLowerCase();

        return Promise.resolve(
            users.filter(
                (user) =>
                    user.label.toLowerCase().includes(term) ||
                    user.description.toLowerCase().includes(term),
            ),
        );
    }

    async function onSave(slots: SlotContent<unknown>[]) {
        console.log("SlotEditor saved:", slots);
    }

    const { Story } = defineMeta({
        component: SlotEditor,
        title: "Library/Admin/SlotEditor",
        tags: ["autodocs"],
        args: {
            labels,
            search,
            onSave,
            maxSlots: 3,
        },
    });
</script>

<Story name="Empty" args={{ contents: [] }} />

<Story name="PartiallyFilled" args={{ contents: [users[0]] }} />

<Story name="Full" args={{ contents: users.slice(0, 3) }} />

<Story name="SixSlots" args={{ contents: users, maxSlots: 6 }} />
