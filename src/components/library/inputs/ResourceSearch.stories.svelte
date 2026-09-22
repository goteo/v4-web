<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import ResourceSearch from "./ResourceSearch.svelte";

    const PROJECTS = [
        { name: "La Marea - Climática", subtitle: "Periodismo independiente" },
        { name: "La Viella en casa", subtitle: "Cultura popular" },
        { name: "Som la resistència: fem créixer el CE Europa", subtitle: "Deporte de base" },
        { name: "L'éstiu va arribar aviat", subtitle: "Artes escénicas" },
    ];

    const USERS = [{ name: "Lara Soto", handle: "lara" }];

    const normalize = (value) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

    // Stands in for a real ResourceSearcher, with a delay so the loading state shows.
    const fakeSearch = (group) => async (query) => {
        await new Promise((resolve) => setTimeout(resolve, 200));

        const source = group === "Usuarios" ? USERS : PROJECTS;

        return source
            .filter((entry) => normalize(entry.name).includes(normalize(query)))
            .map((entry) => ({
                id: `${group}-${entry.name}`,
                value: entry.name,
                label: entry.name,
                detail: entry.handle ? `@${entry.handle}` : entry.subtitle,
                group: group || undefined,
                raw: entry,
            }));
    };

    const combined = async (query) =>
        (await Promise.all([fakeSearch("Proyectos")(query), fakeSearch("Usuarios")(query)])).flat();

    const { Story } = defineMeta({
        component: ResourceSearch,
        title: "Library/ResourceSearch",
        tags: ["autodocs"],
        args: {
            search: fakeSearch(""),
            label: "Busca un proyecto",
            placeholder: "Busca un proyecto",
        },
    });
</script>

<Story name="Single" />

<Story name="Multiple" args={{ multiple: true }} />

<Story name="Grouped" args={{ search: combined }} />

<Story name="WithError" args={{ error: "Elige un proyecto de la lista" }} />
