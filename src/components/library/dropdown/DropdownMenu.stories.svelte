<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import DropdownMenu from "./DropdownMenu.svelte";

    const options = [
        { id: "tech", label: "Technology", selected: false },
        { id: "health", label: "Health", selected: false },
        { id: "energy", label: "Energy", selected: false },
        { id: "finance", label: "Finance", selected: false },
        { id: "real-estate", label: "Real Estate", selected: false },
    ];

    const preselected = [
        { id: "tech", label: "Technology", selected: true },
        { id: "energy", label: "Energy", selected: true },
    ];

    const { Story } = defineMeta({
        component: DropdownMenu,
        title: "Library/Dropdown/DropdownMenu",
        tags: ["autodocs"],
        args: {
            options,
            variant: "basic",
            selected: [],
        },
        argTypes: {
            variant: { control: "select", options: ["basic", "multiselect"] },
            chips: { control: "boolean" },
        },
    });
</script>

<Story name="Basic" args={{ variant: "basic" }} />

<Story name="Multiselect" args={{ variant: "multiselect" }} />

<Story name="MultiselectWithPreselected" args={{ variant: "multiselect", selected: preselected }} />

<Story name="Loading" args={{ variant: "basic", isOpen: true, loading: true }} />

<Story name="Chips" args={{ variant: "multiselect", chips: true, selected: preselected }} />
