<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import { locale, t } from "../../../../i18n/store";
    import { formatDate } from "../../../../utils/dates";
    import { renderMarkdown } from "../../../../utils/renderMarkdown";
    import Title from "../../../library/typography/Title.svelte";

    import type { BlogPostListItem } from "../../../../repositories/blogPosts";

    interface Props {
        open?: boolean;
        post: BlogPostListItem | null;
    }

    let { open = $bindable(false), post }: Props = $props();
</script>

<Modal
    bind:open
    closeBtnClass="top-7 end-7 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex max-h-[90vh] w-full max-w-200 -translate-x-1/2 -translate-y-1/2 divide-y-0 overflow-y-auto rounded-3xl bg-white shadow-lg backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    bodyClass="p-8"
>
    {#if post}
        <article class="flex flex-col gap-6">
            {#if post.headerUrl}
                {#if post.headerType?.startsWith("video/")}
                    <!-- svelte-ignore a11y_media_has_caption -->
                    <video src={post.headerUrl} controls class="w-full rounded-2xl"></video>
                {:else}
                    <img src={post.headerUrl} alt="" class="w-full rounded-2xl object-cover" />
                {/if}
            {/if}

            <header class="flex flex-col gap-2">
                <Title level={2} variant="headline">{post.title}</Title>
                {#if post.subtitle}
                    <p class="text-content text-lg">{post.subtitle}</p>
                {/if}
                <p class="text-content text-sm">
                    {post.published && post.publishedAt
                        ? formatDate(post.publishedAt, $locale)
                        : $t("pages.admin.comm.blog.list.draft")}
                    {#if post.author}- {post.author}{/if}
                </p>
            </header>

            {#await renderMarkdown(post.content) then html}
                <div class="text-content flex flex-col gap-4 [&_a]:underline">{@html html}</div>
            {/await}

            {#if post.videoUrl}
                <a
                    href={post.videoUrl}
                    target="_blank"
                    rel="noopener"
                    class="text-secondary underline"
                >
                    {post.videoUrl}
                </a>
            {/if}
        </article>
    {/if}
</Modal>
