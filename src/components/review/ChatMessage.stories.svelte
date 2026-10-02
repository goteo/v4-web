<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import ChatMessage from "./ChatMessage.svelte";

    const { Story } = defineMeta({
        component: ChatMessage,
        title: "Library/ChatMessage",
        tags: ["autodocs"],
        args: {
            name: "Alex Johnson",
            message: "Hey! Just checking in on the campaign progress.",
            date: new Date("2024-03-15T10:30:00"),
        },
        argTypes: {
            type: { control: "select", options: ["own", "foreign"] },
        },
    });
</script>

<Story name="Foreign" args={{ type: "foreign" }} />

<Story name="Own" args={{ type: "own", name: "You" }} />

<Story
    name="ForeignWithPhoto"
    args={{ type: "foreign", photo: "/images/promoters/promoter-1.jpg" }}
/>

<Story
    name="OwnWithPhoto"
    args={{ type: "own", name: "You", photo: "/images/promoters/promoter-2.jpg" }}
/>

<Story
    name="LongMessage"
    args={{
        type: "foreign",
        message:
            "This is a longer message to test how the bubble handles multi-line content. It should wrap gracefully and maintain proper padding and alignment throughout.",
    }}
/>
