<script module lang="ts">
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import DropdownSearch from "./DropdownSearch.svelte";

    const options = [
        { id: "tech", label: "Technology", selected: false },
        { id: "health", label: "Health", selected: false },
        { id: "energy", label: "Energy", selected: false },
        { id: "finance", label: "Finance", selected: false },
        { id: "real-estate", label: "Real Estate", selected: false },
    ];

    const filter = (query: string) =>
        options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

    /** Fake remote search, slow enough to show the spinner. */
    const remoteSearch = (query: string) =>
        new Promise<typeof options>((resolve) => setTimeout(() => resolve(filter(query)), 800));

    const { Story } = defineMeta({
        component: DropdownSearch,
        title: "Library/Dropdown/DropdownSearch",
        tags: ["autodocs"],
        args: {
            variant: "basic",
            search: filter,
            debounceMs: 0,
            selected: [],
        },
        argTypes: {
            variant: { control: "select", options: ["basic", "multiselect"] },
            chips: { control: "boolean" },
            clearable: { control: "boolean" },
        },
    });
</script>

<Story name="LocalFilter" args={{ singleSelect: true, clearable: true }} />

<Story
    name="RemoteSearch"
    args={{
        singleSelect: true,
        clearable: true,
        search: remoteSearch,
        minChars: 2,
        debounceMs: 300,
    }}
/>

<Story name="MultiselectChips" args={{ variant: "multiselect", chips: true }} />
