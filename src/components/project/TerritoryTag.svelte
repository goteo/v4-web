<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import { locale } from "../../i18n/store";
    import { getTerritoryDisplayName } from "../../utils/territory";
    import MapIcon from "../icons/Location.svelte";
    import Tag from "../library/tags/Tag.svelte";

    import type { Territory } from "../../openapi/client";

    let {
        territory,
        class: classes = "",
        iconSize = "32",
    }: {
        territory: Territory;
        class?: ClassNameValue;
        iconSize?: string | number;
    } = $props();
</script>

<Tag class={twMerge("border border-black", classes)}>
    <MapIcon width={iconSize} height={iconSize} />
    <span>{getTerritoryDisplayName(territory, $locale)}</span>
</Tag>
