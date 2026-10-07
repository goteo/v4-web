<script lang="ts">
    import { actions } from "astro:actions";
    import { TableBodyCell } from "flowbite-svelte";
    import { untrack } from "svelte";

    import BlogPreviewModal from "./BlogPreviewModal.svelte";
    import { languagesList } from "../../../../i18n/locales";
    import { locale, t } from "../../../../i18n/store";
    import { BLOG_BASE_LOCALE } from "../../../../utils/blog";
    import { formatDate } from "../../../../utils/dates";
    import Edit from "../../../icons/actions/Edit.svelte";
    import PlusIcon from "../../../icons/actions/PlusIcon.svelte";
    import Eye from "../../../icons/media/Eye.svelte";
    import Button from "../../../library/buttons/Button.svelte";
    import Toast from "../../../library/feedback/Toast.svelte";
    import Search from "../../../library/inputs/Search.svelte";
    import Toggle from "../../../library/inputs/Toggle.svelte";
    import DataTable from "../../../library/tables/DataTable.svelte";
    import Title from "../../../library/typography/Title.svelte";

    import type { BlogPostListItem } from "../../../../repositories/blogPosts";
    import type { DataTableHeader } from "../../../library/tables/DataTable.svelte";

    interface Props {
        posts: BlogPostListItem[];
    }

    let { posts }: Props = $props();

    // Toggling publish edits this copy; the server list only arrives on page load.
    let rows = $state(untrack(() => posts));

    let query = $state("");

    // ponytail: filters every post client-side; move to a LIMIT/OFFSET query once there are thousands
    const filtered = $derived.by(() => {
        const needle = query.trim().toLowerCase();

        if (!needle) return rows;

        return rows.filter((post) =>
            [String(post.id), post.title, post.subtitle ?? "", post.content].some((field) =>
                field.toLowerCase().includes(needle),
            ),
        );
    });

    const headers: DataTableHeader[] = [
        { key: "pages.admin.comm.blog.list.headers.id", class: "w-24" },
        { key: "pages.admin.comm.blog.list.headers.title" },
        { key: "pages.admin.comm.blog.list.headers.info" },
        { key: "pages.admin.comm.blog.list.headers.translations" },
        { key: "pages.admin.comm.blog.list.headers.published" },
        { key: "", class: "w-32" },
    ];

    const itemsPerPage = 10;
    let currentPage = $state(1);

    const paginatedRows = $derived(
        filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    );

    let errorMessage = $state("");
    let showError = $state(false);

    // Toggle flips its own state on click, so a failed save has to remount it to show the old one.
    let failures = $state(0);

    const rowAction =
        "text-secondary border-variant1 flex size-10 cursor-pointer items-center justify-center rounded-full border bg-white transition-transform duration-200 hover:scale-110";

    let isPreviewOpen = $state(false);
    let postToPreview = $state<BlogPostListItem | null>(null);

    function openPreview(post: BlogPostListItem) {
        postToPreview = post;
        isPreviewOpen = true;
    }

    function translationsOf(post: BlogPostListItem): string {
        const names = post.locales
            .filter((code) => code !== BLOG_BASE_LOCALE)
            .map((code) => languagesList[code]);

        return names.join(", ") || "-";
    }

    async function togglePublished(post: BlogPostListItem, published: boolean) {
        const formData = new FormData();
        formData.set("id", String(post.id));
        formData.set("published", published ? "1" : "0");

        const { error } = await actions.setBlogPostPublished(formData);

        if (error) {
            errorMessage = error.message;
            showError = true;
            failures += 1;

            return;
        }

        rows = rows.map((row) =>
            row.id === post.id
                ? {
                      ...row,
                      published,
                      publishedAt: row.publishedAt ?? (published ? new Date() : null),
                  }
                : row,
        );
    }
</script>

<div class="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
    <div class="flex max-w-150 flex-col gap-4">
        <Title level={2} variant="headline">
            {$t("pages.admin.comm.blog.title")}
        </Title>
        <p class="text-content text-base font-normal">
            {$t("pages.admin.comm.blog.description")}
        </p>
    </div>

    <Button href={`/${$locale}/admin/comm/blog/new`} class="flex w-fit items-center gap-2 px-6">
        <PlusIcon class="size-5" />
        {$t("pages.admin.comm.blog.list.new")}
    </Button>
</div>

<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
    <Title level={3} variant="subsection">
        {$t("pages.admin.comm.blog.list.total", { total: filtered.length })}
    </Title>

    <Search
        class="sm:max-w-105"
        id="blog-search"
        bind:value={query}
        placeholder={$t("pages.admin.comm.blog.list.searchPlaceholder")}
        oninput={() => (currentPage = 1)}
        onclear={() => {
            query = "";
            currentPage = 1;
        }}
    />
</div>

<DataTable
    {headers}
    rows={paginatedRows}
    isLoading={false}
    emptyMessage="pages.admin.comm.blog.list.noData"
    {currentPage}
    totalItems={filtered.length}
    {itemsPerPage}
    onPageChange={(page) => (currentPage = page)}
>
    {#snippet children(post: BlogPostListItem)}
        <TableBodyCell class="border-variant1 rounded-l-md border-t border-b border-l p-4">
            {post.id}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 max-w-80 truncate border-t border-b p-4">
            {post.title}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 max-w-80 border-t border-b p-4">
            <p class="truncate">
                {#if post.published && post.publishedAt}
                    {formatDate(post.publishedAt, $locale)}
                {:else}
                    <span class="font-bold">{$t("pages.admin.comm.blog.list.draft")}</span>
                {/if}
                {#if post.author}- {post.author}{/if}
            </p>
            <p class="truncate text-xs">{post.subtitle || "-"}</p>
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            {translationsOf(post)}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 border-t border-b p-4">
            {#key failures}
                <Toggle
                    value={post.published}
                    aria-label={$t("pages.admin.comm.blog.list.headers.published")}
                    onChange={(published) => togglePublished(post, published)}
                />
            {/key}
        </TableBodyCell>
        <TableBodyCell class="border-variant1 w-32 rounded-r-md border-t border-r border-b p-4">
            <div class="flex items-center gap-3">
                <a
                    href={`/${$locale}/admin/comm/blog/${post.id}`}
                    class={rowAction}
                    aria-label={$t("pages.admin.comm.blog.list.edit")}
                >
                    <Edit class="size-5" />
                </a>
                <button
                    type="button"
                    class={rowAction}
                    aria-label={$t("common.preview")}
                    onclick={() => openPreview(post)}
                >
                    <Eye class="size-5" />
                </button>
            </div>
        </TableBodyCell>
    {/snippet}
</DataTable>

<BlogPreviewModal bind:open={isPreviewOpen} post={postToPreview} />

<Toast floating variant="error" bind:showToast={showError}>{errorMessage}</Toast>
