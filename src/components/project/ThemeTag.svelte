<script lang="ts">
    import { locale } from "../../i18n/store";
    import { apiThemesIdOrSlugGet, type Theme } from "../../openapi/client";
    import { extractId } from "../../utils/extractId";
    import BookmarkIcon from "../icons/actions/Bookmark.svelte";
    import Tag from "../library/tags/Tag.svelte";

    interface Props {
        iri: string;
    }

    let { iri }: Props = $props();

    async function getTheme(iri: string): Promise<Theme> {
        const { data: theme } = await apiThemesIdOrSlugGet({
            headers: { "Accept-Language": $locale },
            path: { idOrSlug: extractId(iri)! },
        });

        return theme!;
    }
</script>

<Tag class="border border-black">
    <BookmarkIcon />
    {#await getTheme(iri) then theme}
        <span>{theme?.name}</span>
    {/await}
</Tag>
