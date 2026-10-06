<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import ChatTextarea from "./ChatTextarea.svelte";

    const { Story } = defineMeta({
        component: ChatTextarea,
        title: "Library/Review/ChatTextarea",
        tags: ["autodocs"],
    });
</script>

<Story name="Default" />
