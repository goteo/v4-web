<script lang="ts">
    import { locale, t } from "../../i18n/store";
    import { BLOG_SECTIONS } from "../../utils/blog";
    import { formatDate } from "../../utils/dates";
    import TabNavigation from "../library/layout/TabNavigation.svelte";
    import Pagination from "../library/paginations/Pagination.svelte";
    import Tag from "../library/tags/Tag.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { BlogPostRecord } from "../../repositories/blogPosts";
    import type { BlogSection } from "../../utils/blog";

    interface Props {
        posts: BlogPostRecord[];
        total: number;
        page: number;
        perPage: number;
        section: BlogSection | null;
    }

    let { posts, total, page, perPage, section }: Props = $props();

    const ALL = "all";

    // Filters and pages are server-rendered, so changing them is a navigation.
    function navigate(changes: { section?: string; page?: number }) {
        const nextSection = changes.section ?? section ?? ALL;
        const query = new URLSearchParams();

        if (nextSection !== ALL) query.set("section", nextSection);
        if (changes.page && changes.page > 1) query.set("page", String(changes.page));

        location.search = query.toString();
    }
</script>

<div class="flex flex-col gap-10">
    <TabNavigation
        tabs={[ALL, ...BLOG_SECTIONS].map((id) => ({
            id,
            label:
                id === ALL ? $t("pages.blog.all") : $t(`pages.admin.comm.blog.form.sections.${id}`),
        }))}
        currentTab={section ?? ALL}
        onTabClick={(id) => navigate({ section: id })}
    />

    {#if posts.length === 0}
        <p class="text-content py-12 text-center">{$t("pages.blog.empty")}</p>
    {:else}
        <ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {#each posts as post (post.id)}
                {@const cover = post.headerMedia.find((media) => media.type.startsWith("image/"))}
                <li>
                    <a
                        href={`/${$locale}/blog/${post.id}`}
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
                                <Tag variant="bold">
                                    {$t(`pages.admin.comm.blog.form.sections.${post.section}`)}
                                </Tag>
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
