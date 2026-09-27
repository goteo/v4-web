<script lang="ts">
    import { locale, t } from "../i18n/store";
    import { apiCategoriesGetCollection, type Category } from "../openapi/client";

    const MAX_ITEMS = 10;
    const ITEMS_PER_COLUMN = 5;

    async function getCategories(): Promise<Category[]> {
        const { data: categories } = await apiCategoriesGetCollection({
            baseUrl: "/api/relay",
            headers: { "Accept-Language": $locale },
        });

        return categories ?? [];
    }

    function chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];

        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }

        return chunks;
    }
</script>

{#await getCategories() then categories}
    {@const hasMore = categories.length > MAX_ITEMS}

    {@const visibleCategories = categories.slice(0, hasMore ? MAX_ITEMS - 1 : MAX_ITEMS)}

    {@const items = hasMore
        ? [...visibleCategories, { id: "_all", name: $t("common.viewAll") }]
        : visibleCategories}

    {@const columns = chunkArray(items, ITEMS_PER_COLUMN)}

    <div class="flex gap-10">
        {#each columns as column}
            <ul class="space-y-3">
                {#each column as category}
                    <li>
                        {#if category.id === "_all"}
                            <a class="font-bold text-black" href="/search">
                                {category.name} &gt;
                            </a>
                        {:else}
                            <a
                                class="font-bold text-black"
                                href="/search?categories[]={category.id}"
                            >
                                {category.name}
                            </a>
                        {/if}
                    </li>
                {/each}
            </ul>
        {/each}
    </div>
{/await}
