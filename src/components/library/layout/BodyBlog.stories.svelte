<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import BodyBlog from "./BodyBlog.svelte";

    const samplePost = {
        title: "Lorem ipsum dolor sit amet consectetur",
        description:
            "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante.",
        cover: "/images/home/stories-main.png",
        date: new Date("2024-03-15"),
        author: {
            name: "Prueba",
            avatar: "/images/promoters/promoter-1.jpg",
        },
        body: `## Lorem ipsum dolor sit amet

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus. Sed sit amet ipsum mauris. Maecenas congue ligula ac quam viverra nec consectetur ante hendrerit.

## Sed ut perspiciatis

> "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit." — Cicero

Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam:

- Nisi ut aliquid ex ea commodi consequatur
- Quis autem vel eum iure reprehenderit
- Qui in ea voluptate velit esse quam nihil

## At vero eos et accusamus

Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est.

### Temporibus autem quibusdam

Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.

## Conclusio

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
    };

    const { Story } = defineMeta({
        component: BodyBlog,
        title: "Library/BodyBlog",
        tags: ["autodocs"],
        args: {
            post: samplePost,
        },
    });
</script>

<Story name="Default" />

<Story
    name="WithoutCover"
    args={{
        post: { ...samplePost, cover: undefined },
    }}
/>

<Story
    name="WithoutAuthor"
    args={{
        post: { ...samplePost, author: undefined },
    }}
/>

<Story
    name="MinimalPost"
    args={{
        post: {
            avatar: null,
            date: new Date("2024-01-01"),
            title: "Lorem ipsum dolor sit amet",
            body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor **incididunt ut labore** et *dolore magna aliqua*.",
        },
    }}
/>
