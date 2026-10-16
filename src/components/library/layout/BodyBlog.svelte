<script lang="ts">
    import { marked } from "marked";
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import MediaCarousel from "./MediaCarousel.svelte";
    import { locale, t } from "../../../i18n/store";
    import { formatDate } from "../../../utils/dates";
    import DefaultAvatar from "../../icons/DefaultAvatar.svelte";
    import ShareButton from "../share/ShareButton.svelte";

    interface BlogPost {
        title?: string;
        description?: string;
        /** Embeddable player URL, shown above the media */
        video?: string;
        /** Header carousel of images and videos */
        media?: { url: string; type: string }[];
        date: Date;
        author?: { name: string; avatar?: string };
        body?: string;
    }

    interface Props {
        post: BlogPost;
        class?: ClassNameValue;
    }

    let { post, class: className = "" }: Props = $props();

    const containerClasses = $derived(
        twMerge("flex min-h-screen flex-col items-center", className),
    );
    const parsedBody = $derived(marked(post.body ?? ""));
</script>

<div class={containerClasses}>
    <div class="w-full max-w-[898px] pt-4" id="top">
        <h1>{post.title}</h1>
        <p class="text-content pb-4">
            {post.description}
        </p>
    </div>

    {#if post.video}
        <iframe
            src={post.video}
            title={post.title}
            class="mt-2 mb-6 aspect-video w-full max-w-[898px] rounded-2xl"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowfullscreen
            loading="lazy"
        ></iframe>
    {/if}

    <!-- Outside the text column so the previous and next items can peek in at the sides. -->
    {#if post.media?.length}
        <MediaCarousel media={post.media} alt={post.title} class="pt-2" />
    {/if}

    <div class="w-full max-w-[898px] pb-4">
        <div class="meta-container pt-6">
            <div class="profile-section">
                {#if post.author?.avatar}
                    <img src={post.author.avatar} class="avatar" alt={post.author.name} />
                {:else}
                    <DefaultAvatar width="64" height="64" class="rounded-lg" />
                {/if}
                <div class="info">
                    {#if post.author}
                        <p class="author-name">
                            {$t("pages.blog.by", { author: post.author.name })}
                        </p>
                    {/if}
                    <time class="date" datetime={post.date.toISOString()}>
                        {formatDate(post.date, $locale)}
                    </time>
                </div>
            </div>

            <!-- Transparent border so the hover one does not shift the layout. -->
            <ShareButton
                shareText={post.title ?? ""}
                variant="blog"
                buttonClass="hover:border-secondary rounded-2xl border border-transparent px-4 transition-colors duration-200"
            />
        </div>

        <div
            class="blog-body marked-content mt-8 flex flex-col gap-6"
            style="overflow-wrap: break-word; word-wrap: break-word; word-break: break-word;"
        >
            {@html parsedBody}
        </div>
    </div>
</div>

<style>
    h1 {
        padding-bottom: 16px;
        color: var(--color-secondary);
        font-size: 40px;
        font-weight: var(--font-weight-black);
        line-height: 1.2;
    }

    .meta-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .profile-section {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .avatar {
        border-radius: 8px;
        width: 64px;
        height: 64px;
        object-fit: cover;
    }

    .author-name {
        color: var(--color-secondary);
        font-weight: 700;
        margin: 0;
    }

    .date {
        display: block;
        color: #575757;
        font-size: 14px;
        margin: 0;
    }

    .btn-share {
        display: flex;
        padding: 8px 16px;
        align-items: center;
        gap: 8px;
        border-radius: 16px;
        border: 1px solid var(--color-secondary);
        background: transparent;
        cursor: pointer;
        font-weight: bold;
        color: var(--color-secondary);
        transition: opacity 0.2s;
    }

    .blog-body :global(h2) {
        padding-top: 24px;
        padding-bottom: 8px;
        color: var(--color-secondary);
        font-family: var(--font-body);
        font-size: 24px;
        font-weight: 700;
        line-height: 32px;
    }

    .blog-body :global(h3) {
        padding-top: 16px;
        padding-bottom: 8px;
        color: var(--color-secondary);
        font-family: var(--font-body);
        font-size: 20px;
        font-weight: 700;
        line-height: 28px;
    }

    .blog-body :global(p) {
        color: var(--color-content);
        font-family: var(--font-body);
        font-size: 16px;
        font-weight: 400;
        line-height: 24px;
    }

    .blog-body :global(blockquote) {
        border-left: 4px solid var(--color-secondary);
        padding-left: 16px;
        margin: 16px 0;
        color: var(--color-content);
        font-style: italic;
    }

    .blog-body :global(ul),
    .blog-body :global(ol) {
        padding-left: 24px;
        color: var(--color-content);
        font-size: 16px;
        line-height: 24px;
        list-style: initial;
    }

    .blog-body :global(ol) {
        list-style: decimal;
    }

    .blog-body :global(li) {
        margin-bottom: 4px;
    }

    .blog-body :global(strong) {
        font-weight: 700;
        color: var(--color-secondary);
    }

    .blog-body :global(em) {
        font-style: italic;
    }

    .blog-body :global(a) {
        color: var(--color-primary);
        text-decoration: underline;
        overflow-wrap: break-word;
        word-break: break-word;
    }

    .blog-body :global(pre) {
        overflow-x: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
        max-width: 100%;
    }
</style>
