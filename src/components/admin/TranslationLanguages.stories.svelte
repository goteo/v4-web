<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import TranslationLanguages from "./TranslationLanguages.svelte";

    const { Story } = defineMeta({
        component: TranslationLanguages,
        title: "Admin/TranslationLanguages",
        tags: ["autodocs"],
        args: {
            languages: ["es"],
            selected: "es",
            onAdd: () => {},
            onRemove: () => {},
        },
    });
</script>

<Story name="One language" />

<Story name="Several languages" args={{ languages: ["es", "en", "ca"], selected: "en" }} />
