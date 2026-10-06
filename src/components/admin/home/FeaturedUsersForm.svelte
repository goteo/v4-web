<script lang="ts">
    import { actions } from "astro:actions";

    import { t } from "../../../i18n/store";
    import { apiUsersGetCollection } from "../../../openapi/client/sdk.gen";
    import { MAX_FEATURED_USERS } from "../../../utils/featuredUsers";
    import { toCollectionItems } from "../../../utils/hydra";
    import SlotEditor from "../slots/SlotEditor.svelte";

    import type { User } from "../../../openapi/client/types.gen";
    import type { SlotContent, SlotLabels } from "../slots/slots.types";
    import type { ClassNameValue } from "tailwind-merge";

    interface SlotAssignment {
        position: number;
        userId: number;
        name: string;
        handle: string;
        avatar: string | null;
    }

    interface Props {
        class?: ClassNameValue;
        config: {
            slots: SlotAssignment[];
        };
    }

    let { class: classes = "", config }: Props = $props();

    /**
     * The editor speaks in opaque values and ordered slots; this wrapper is the
     * only place that knows a value means a user id.
     */
    const contents = $derived<SlotContent<number>[]>(
        [...config.slots]
            .sort((a, b) => a.position - b.position)
            .map(({ userId, name, handle, avatar }) => ({
                value: userId,
                label: name,
                description: handle,
                imageUrl: avatar,
            })),
    );

    async function searchUsers(query: string): Promise<SlotContent<number>[]> {
        const { data, error } = await apiUsersGetCollection({
            baseUrl: "/api/relay",
            headers: { Accept: "application/ld+json" },
            query: { q: query, itemsPerPage: 10 },
        });

        if (error) {
            console.error("User search failed:", error);
            return [];
        }

        return toCollectionItems<User>(data)
            .filter((user) => typeof user.id === "number")
            .map((user) => ({
                value: user.id as number,
                label: user.displayName ?? user.handle ?? "",
                description: user.handle,
                imageUrl: user.avatar ?? null,
            }));
    }

    async function saveUsers(slots: SlotContent<number>[]) {
        return actions.saveFeaturedUsers({
            users: slots.map(({ value: userId }) => ({ userId })),
        });
    }

    const labels = $derived<SlotLabels>({
        title: $t("pages.admin.home.featuredUsers.title"),
        description: $t("pages.admin.home.featuredUsers.description"),
        selectionTitle: $t("pages.admin.home.featuredUsers.selection.title"),
        empty: $t("pages.admin.home.featuredUsers.selection.empty"),
        add: $t("pages.admin.home.featuredUsers.selection.add"),
        change: $t("pages.admin.home.featuredUsers.selection.change"),
        modalTitle: $t("pages.admin.home.featuredUsers.modal.title"),
        modalDescription: $t("pages.admin.home.featuredUsers.modal.description"),
        searchPlaceholder: $t("pages.admin.home.featuredUsers.modal.search"),
        submit: $t("pages.admin.home.featuredUsers.modal.submit"),
    });
</script>

<SlotEditor
    class={classes}
    {contents}
    maxSlots={MAX_FEATURED_USERS}
    {labels}
    search={searchUsers}
    onSave={saveUsers}
/>
