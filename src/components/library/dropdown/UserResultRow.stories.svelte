<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import UserResultRow from "./UserResultRow.svelte";

    const WITH_AVATAR = {
        id: 42,
        handle: "lara",
        email: "lara.soto@goteo.org",
        displayName: "Lara Soto",
        avatar: "/images/promoters/project-owners/iridia.png",
    };

    const NO_AVATAR = {
        id: 7,
        handle: "jordi",
        email: "jordi.puig@goteo.org",
        displayName: "Jordi Puig",
    };

    const NO_DISPLAY_NAME = {
        id: 9,
        handle: "lluerna",
        email: "hola@lluerna.coop",
    };

    const LONG_NAME = {
        id: 15,
        handle: "colectivo",
        email: "contacto@colectivo-sin-nombre.org",
        displayName: "Colectivo Sin Nombre de Periodismo Independiente",
        avatar: "/images/promoters/project-owners/la-marea.png",
    };

    const { Story } = defineMeta({
        component: UserResultRow,
        title: "Library/Dropdown/UserResultRow",
        tags: ["autodocs"],
        args: {
            user: WITH_AVATAR,
            showEmail: false,
        },
        argTypes: {
            showEmail: { control: "boolean" },
            highlightQuery: { control: "text" },
        },
    });
</script>

<Story name="Default" />

<Story name="NoAvatar" args={{ user: NO_AVATAR }} />

<Story name="NoDisplayName" args={{ user: NO_DISPLAY_NAME }} />

<Story name="AdminEmail" args={{ showEmail: true }} />

<Story name="WithHighlight" args={{ highlightQuery: "lar" }} />

<Story name="TruncatedName" args={{ user: LONG_NAME, showEmail: true }} />

<Story name="List">
    <div class="w-90 rounded-lg bg-white shadow-2xl">
        {#each [WITH_AVATAR, NO_AVATAR, NO_DISPLAY_NAME, LONG_NAME] as user (user.id)}
            <UserResultRow
                class="border-grey border-b p-4 last:border-b-0"
                {user}
                showEmail={true}
            />
        {/each}
    </div>
</Story>
