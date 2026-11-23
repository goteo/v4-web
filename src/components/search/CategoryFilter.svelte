<!--
Category Filter Component
Interactive category selection using existing categories from utils/categories.ts
Implements active/inactive pill states matching Figma design
-->
<script lang="ts">
    import { locale, t } from "../../i18n/store";
    import {
        apiCategoriesGetCollection,
        apiCategoriesIdOrSlugGet,
        type Category,
    } from "../../openapi/client";
    import { extractId } from "../../utils/extractId";
    import CategorySelect from "../library/inputs/CategorySelect.svelte";
    import Title from "../library/typography/Title.svelte";

    interface Props {
        selectedCategories?: string[];
        onCategoryChange?: (categories: string[]) => void;
        showLabel?: boolean;
    }

    let { selectedCategories = [], onCategoryChange, showLabel = true }: Props = $props();

    let categories = getAvailableCategories();
    let selected = $state<Category[]>([]);

    $effect(() => {
        Promise.all(selectedCategories.map((s) => getCategory(s))).then((categories) => {
            selected = categories;
        });
    });

    async function getAvailableCategories(): Promise<Category[]> {
        const { data } = await apiCategoriesGetCollection();

        if (!data) {
            return [];
        }

        return data;
    }

    async function getCategory(iri: string): Promise<Category> {
        const { data: category } = await apiCategoriesIdOrSlugGet({
            headers: { "Accept-Language": $locale },
            path: { idOrSlug: extractId(iri) || iri },
        });

        return category!;
    }
</script>

<div class="w-full">
    {#if showLabel}
        <Title level={3} variant="field" class="font-body mb-3">
            {$t("pages.search.filters.categoryLabel")}
        </Title>
    {/if}

    {#await categories then categories}
        <CategorySelect
            bind:selected
            selectedIds={selected.map((s) => s.id!)}
            options={categories}
            onChange={(selected) => onCategoryChange?.(selected.map((o) => `${o.id}`))}
        />
    {/await}

    {#if selected.length > 0}
        <div class="mt-4 text-sm text-black opacity-70">
            {$t("pages.search.filters.selectedCategories", { count: selected.length })}
        </div>
    {/if}
</div>
