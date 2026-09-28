<script module lang="ts">
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import RichTextEditor from "./RichTextEditor.svelte";

    const { Story } = defineMeta({
        component: RichTextEditor,
        title: "Library/RichTextEditor",
        tags: ["autodocs"],
        argTypes: {
            error: { control: "text" },
            placeholder: { control: "text" },
        },
    });
</script>

<Story
    name="Default"
    args={{
        id: "rte-default",
        format: "markdown",
        placeholder: "Escribe algo...",
        value: "",
        onChange: () => {},
    }}
/>

<Story
    name="MultiParagraph"
    args={{
        id: "rte-multiparagraph",
        format: "markdown",
        placeholder: "Escribe algo...",
        value: "Primer párrafo de ejemplo.\n\nSegundo párrafo separado con el mismo espaciado que en la página de campaña.\n\nTercer párrafo con **negrita**, *cursiva* y un [enlace](https://goteo.org).\n\n- Primer punto\n- Segundo punto\n\n1. Paso uno\n2. Paso dos\n\n> Una cita destacada.",
        onChange: () => {},
    }}
/>

<Story
    name="MinimalToolbar"
    args={{
        id: "rte-minimal",
        format: "markdown",
        placeholder: "Escribe algo...",
        value: "",
        showFontSize: false,
        showAlignment: false,
        showImage: false,
        showLink: false,
        showQuote: false,
        onChange: () => {},
    }}
/>
