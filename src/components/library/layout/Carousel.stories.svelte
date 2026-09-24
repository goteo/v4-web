<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import Carousel from "./Carousel.svelte";

    const { Story } = defineMeta({
        component: Carousel,
        title: "Library/Carousel",
        tags: ["autodocs"],
        args: {
            itemsPerGroup: 1,
            gap: 24,
            showDots: true,
            mobileItemsToShow: 1,
            desktopItemsToShow: 3,
            dotsPerItem: false,
            lockItemWidth: true,
            disableDrag: false,
            navButtonTop: "50%",
            centerNavButtons: true,
            activeCard: 0,
        },
        argTypes: {
            itemsPerGroup: { control: "number" },
            gap: { control: "number" },
            showDots: { control: "boolean" },
            mobileItemsToShow: { control: "number" },
            desktopItemsToShow: { control: "number" },
            dotsPerItem: { control: "boolean" },
            lockItemWidth: { control: "boolean" },
            disableDrag: { control: "boolean" },
            navButtonTop: { control: "text" },
            centerNavButtons: { control: "boolean" },
            activeCard: { control: "number" },
        },
    });
</script>

<Story name="Default">
    {#each Array.from({ length: 6 }, (_, i) => i) as i}
        <div class="rounded-lg bg-gray-100 p-6 text-center text-sm font-medium text-gray-500">
            Item {i + 1}
        </div>
    {/each}
</Story>

<Story name="DotsPerItem" args={{ dotsPerItem: true }}>
    {#each Array.from({ length: 6 }, (_, i) => i) as i}
        <div class="rounded-lg bg-gray-100 p-6 text-center text-sm font-medium text-gray-500">
            Item {i + 1}
        </div>
    {/each}
</Story>

<Story name="ItemsPerGroup" args={{ itemsPerGroup: 2 }}>
    {#each Array.from({ length: 6 }, (_, i) => i) as i}
        <div class="rounded-lg bg-gray-100 p-6 text-center text-sm font-medium text-gray-500">
            Item {i + 1}
        </div>
    {/each}
</Story>

<Story name="NoDots" args={{ showDots: false }}>
    {#each Array.from({ length: 6 }, (_, i) => i) as i}
        <div class="rounded-lg bg-gray-100 p-6 text-center text-sm font-medium text-gray-500">
            Item {i + 1}
        </div>
    {/each}
</Story>

<Story name="DisableDrag" args={{ disableDrag: true }}>
    {#each Array.from({ length: 6 }, (_, i) => i) as i}
        <div class="rounded-lg bg-gray-100 p-6 text-center text-sm font-medium text-gray-500">
            Item {i + 1}
        </div>
    {/each}
</Story>

<Story name="Empty" args={{ emptyMessage: "No items to display" }}></Story>

<Story name="EmptyCustomMessage" args={{ emptyMessage: "Nothing here yet" }}></Story>
