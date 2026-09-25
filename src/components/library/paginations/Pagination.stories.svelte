<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import Pagination from "./Pagination.svelte";

    const { Story } = defineMeta({
        component: Pagination,
        title: "Library/Pagination",
        tags: ["autodocs"],
        args: {
            currentPage: 1,
            totalItems: 47,
            itemsPerPage: 10,
            isLoading: false,
        },
        argTypes: {
            currentPage: { control: { type: "number", min: 1 } },
            totalItems: { control: { type: "number", min: 0 } },
            itemsPerPage: { control: { type: "number", min: 1 } },
        },
    });
</script>

<Story name="FewPages" args={{ totalItems: 25, currentPage: 1 }} />

<Story name="Default" args={{ totalItems: 47, currentPage: 2, itemsPerPage: 10 }} />

<Story name="ManyPages" args={{ totalItems: 250, currentPage: 13, itemsPerPage: 10 }} />

<Story name="Empty" args={{ totalItems: 0, currentPage: 1 }} />

<Story name="Loading" args={{ totalItems: 0, currentPage: 1, isLoading: true }} />
