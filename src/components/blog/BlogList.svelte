<script lang="ts">
    import { untrack } from "svelte";

    import { locale, t } from "../../i18n/store";
    import { BLOG_SECTIONS } from "../../utils/blog";
    import { formatDate } from "../../utils/dates";
    import CategorySelect from "../library/inputs/CategorySelect.svelte";
    import TabNavigation from "../library/layout/TabNavigation.svelte";
    import Pagination from "../library/paginations/Pagination.svelte";
    import Tag from "../library/tags/Tag.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { Category, Theme } from "../../openapi/client";
    import type { BlogPostRecord } from "../../repositories/blogPosts";
    import type { BlogSection } from "../../utils/blog";

    interface Props {
        posts: BlogPostRecord[];
        total: number;
        page: number;
        perPage: number;
        section: BlogSection | null;
        /** Path segment the post pages live under, e.g. "blog" or "resources". */
        basePath?: string;
        showSectionTabs?: boolean;
        categories?: Category[];
        themes?: Theme[];
        selectedCategoryIds?: string[];
        selectedThemeIds?: string[];
        showTaxonomyFilters?: boolean;
        /** Server-translated filter headings, so SSR does not depend on the client locale. */
        categoriesLabel?: string;
        themesLabel?: string;
    }

    let {
        posts,
        total,
        page,
        perPage,
        section,
        basePath = "blog",
        showSectionTabs = true,
        categories = [],
        themes = [],
        selectedCategoryIds = [],
        selectedThemeIds = [],
        showTaxonomyFilters = false,
        categoriesLabel = undefined,
        themesLabel = undefined,
    }: Props = $props();

    const ALL = "all";

    let categoryIds = $state<string[]>(untrack(() => [...selectedCategoryIds]));
    let themeIds = $state<string[]>(untrack(() => [...selectedThemeIds]));

    const categoryNames = $derived(new Map(categories.map((item) => [item.id ?? "", item.name])));
    const themeNames = $derived(new Map(themes.map((item) => [item.id ?? "", item.name])));

    /**
     * Names of the categories and themes a post is linked to, skipping identifiers that
     * no longer exist in the API.
     * @param post The post
     * @returns The names, categories first
     */
    function tagNames(post: BlogPostRecord): string[] {
        return [
            ...post.categoryIds.map((id) => categoryNames.get(id)),
            ...post.themeIds.map((id) => themeNames.get(id)),
        ].filter((name): name is string => typeof name === "string");
    }

    // Filters and pages are server-rendered, so changing them is a navigation.
    function navigate(changes: {
        section?: string;
        page?: number;
        categoryIds?: string[];
        themeIds?: string[];
    }) {
        const nextSection = changes.section ?? section ?? ALL;
        const query = new URLSearchParams();

        if (showSectionTabs && nextSection !== ALL) query.set("section", nextSection);

        const nextCategoryIds = changes.categoryIds ?? categoryIds;
        const nextThemeIds = changes.themeIds ?? themeIds;

        if (nextCategoryIds.length > 0) query.set("category", nextCategoryIds.join(","));
        if (nextThemeIds.length > 0) query.set("theme", nextThemeIds.join(","));
        if (changes.page && changes.page > 1) query.set("page", String(changes.page));

        location.search = query.toString();
    }
</script>

<div class="flex flex-col gap-10">
    {#if showSectionTabs}
        <TabNavigation
            tabs={[ALL, ...BLOG_SECTIONS].map((id) => ({
                id,
                label:
                    id === ALL
                        ? $t("pages.blog.all")
                        : $t(`pages.admin.comm.blog.form.sections.${id}`),
            }))}
            currentTab={section ?? ALL}
            onTabClick={(id) => navigate({ section: id })}
        />
    {/if}

    {#if showTaxonomyFilters}
        <div class="flex flex-col gap-6">
            <div class="flex flex-col gap-3">
                <Title level={3} variant="field">
                    {categoriesLabel ?? $t("pages.resources.filters.categories")}
                </Title>
                <CategorySelect
                    options={categories}
                    bind:selectedIds={categoryIds}
                    onChange={(selected) =>
                        navigate({
                            categoryIds: selected
                                .map(({ id }) => id)
                                .filter((id): id is string => typeof id === "string"),
                            page: 1,
                        })}
                />
            </div>
            <div class="flex flex-col gap-3">
                <Title level={3} variant="field">
                    {themesLabel ?? $t("pages.resources.filters.themes")}
                </Title>
                <CategorySelect
                    options={themes}
                    bind:selectedIds={themeIds}
                    onChange={(selected) =>
                        navigate({
                            themeIds: selected
                                .map(({ id }) => id)
                                .filter((id): id is string => typeof id === "string"),
                            page: 1,
                        })}
                />
            </div>
        </div>
    {/if}

    {#if posts.length === 0}
        <p class="text-content py-12 text-center">{$t("pages.blog.empty")}</p>
    {:else}
        <ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {#each posts as post (post.id)}
                {@const cover = post.headerMedia.find((media) => media.type.startsWith("image/"))}
                {@const tags = tagNames(post)}
                <li>
                    <a
                        href={`/${$locale}/${basePath}/${post.id}`}
                        class="group border-grey flex h-full flex-col overflow-hidden rounded-4xl border bg-white shadow-sm"
                    >
                        {#if cover}
                            <img
                                src={cover.url}
                                alt=""
                                loading="lazy"
                                class="aspect-video w-full object-cover"
                            />
                        {:else}
                            <div class="bg-purple-soft aspect-video w-full"></div>
                        {/if}
                        <div class="flex flex-1 flex-col gap-3 p-6">
                            <div class="flex items-center justify-between gap-2">
                                {#if showSectionTabs}
                                    <Tag variant="bold">
                                        {$t(`pages.admin.comm.blog.form.sections.${post.section}`)}
                                    </Tag>
                                {/if}
                                {#if post.publishedAt}
                                    <time
                                        datetime={post.publishedAt.toISOString()}
                                        class="text-content text-sm"
                                    >
                                        {formatDate(post.publishedAt, $locale)}
                                    </time>
                                {/if}
                            </div>
                            <Title
                                level={2}
                                variant="subsection"
                                color="secondary"
                                class="group-hover:underline"
                            >
                                {post.title}
                            </Title>
                            {#if post.subtitle}
                                <p class="text-content line-clamp-3">{post.subtitle}</p>
                            {/if}
                            {#if tags.length > 0}
                                <div class="mt-auto flex flex-wrap gap-2 pt-2">
                                    {#each tags as name (name)}
                                        <Tag class="bg-variant1 text-secondary">{name}</Tag>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    </a>
                </li>
            {/each}
        </ul>

        <Pagination
            currentPage={page}
            totalItems={total}
            itemsPerPage={perPage}
            onPageChange={(next: number) => navigate({ page: next })}
        />
    {/if}
</div>
