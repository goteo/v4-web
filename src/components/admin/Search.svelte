<script lang="ts">
    import { t } from "../../i18n/store";
    import { createAccountingSearcher } from "../../utils/searchers";
    import ResourceSearch from "../library/inputs/ResourceSearch.svelte";

    import type { ProjectJsonld, UserJsonld } from "../../openapi/client/index";
    import type { SearchResultItem } from "../../utils/resourceSearch";

    let {
        onSelectTarget,
        searchPlaceholder,
        onSelectProject,
        onSelectUser,
        resource,
    }: {
        onSelectTarget?: (accounting: string) => void;
        searchPlaceholder?: string;
        onSelectProject?: (project: ProjectJsonld) => void;
        onSelectUser?: (user: UserJsonld) => void;
        resource?: "projects" | "gateway_charges" | "users";
    } = $props();

    let value = $state("");

    const search = $derived(
        createAccountingSearcher({
            resources: [
                ...(!resource || resource === "gateway_charges" || resource === "projects"
                    ? (["projects"] as const)
                    : []),
                ...(!resource || resource === "gateway_charges" ? (["tipjars"] as const) : []),
                ...(!resource || resource === "gateway_charges" || resource === "users"
                    ? (["users"] as const)
                    : []),
            ],
        }),
    );

    function handleSelect(item: SearchResultItem) {
        if (item.id.startsWith("project-")) onSelectProject?.(item.raw as ProjectJsonld);
        if (item.id.startsWith("user-")) onSelectUser?.(item.raw as UserJsonld);

        onSelectTarget?.(item.value);
        value = "";
    }
</script>

<section class="relative w-full">
    <ResourceSearch
        id="admin-search"
        {search}
        bind:value
        placeholder={searchPlaceholder ?? $t("pages.admin.charges.filters.search.placeholder")}
        onSelect={handleSelect}
    >
        {#snippet header(results, query)}
            <p class="px-4 pt-3 text-sm text-gray-500">
                {@html $t(
                    "pages.admin.charges.filters.search.resultsFound",
                    {
                        totalItems: results.length,
                        query: `<span class="font-bold">${query}</span>`,
                    },
                    { allowHTML: true },
                )}
            </p>
        {/snippet}
    </ResourceSearch>
</section>
