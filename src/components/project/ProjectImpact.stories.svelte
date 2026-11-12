<script module>
    import { defineMeta } from "@storybook/addon-svelte-csf";

    import ProjectImpact from "./ProjectImpact.svelte";

    const themes = { education: "Educación", culture: "Cultura" };

    const { Story } = defineMeta({
        component: ProjectImpact,
        title: "Project/ProjectImpact",
        tags: ["autodocs"],
        args: {
            project: { themes: ["/v4/themes/education", "/v4/themes/culture"] },
            socialCommitmentDescription:
                "Texto de prueba. Este proyecto acerca la educación y la cultura a su barrio, ofreciendo talleres abiertos y gratuitos para todas las edades y colaborando con las entidades locales para que nadie se quede fuera.",
        },
        // The SDK reads globalThis.fetch per request: answer theme lookups locally.
        beforeEach: () => {
            const realFetch = globalThis.fetch;

            globalThis.fetch = async (input, init) => {
                const url = new URL(input instanceof Request ? input.url : input, location.href);
                const slug = url.pathname.match(/\/v4\/themes\/([^/]+)$/)?.[1];

                if (!slug) return realFetch(input, init);

                return Response.json({ id: slug, slug, name: themes[slug] ?? slug });
            };

            return () => {
                globalThis.fetch = realFetch;
            };
        },
    });
</script>

<Story name="Education and culture" />
