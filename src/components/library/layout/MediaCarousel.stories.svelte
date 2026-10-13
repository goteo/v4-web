<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import MediaCarousel from "./MediaCarousel.svelte";

    const media = [
        { url: "/images/home/stories-main.png", type: "image/png" },
        { url: "/images/promoters/promoter-1.jpg", type: "image/jpeg" },
        { url: "/images/profile/ilustration-project.png", type: "image/png" },
    ];

    const { Story } = defineMeta({
        component: MediaCarousel,
        title: "Library/MediaCarousel",
        tags: ["autodocs"],
        args: { media },
    });
</script>

<Story name="Default" />

<Story name="SingleItem" args={{ media: media.slice(0, 1) }} />
