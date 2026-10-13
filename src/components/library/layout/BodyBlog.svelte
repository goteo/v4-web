<script lang="ts">
    import { marked } from "marked";
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import ShareButton from "../share/ShareButton.svelte";

    interface BlogPost {
        title?: string;
        description?: string;
        cover?: string;
        date: Date;
        author?: { name: string; avatar: string };
        body?: string;
    }

    interface Props {
        post: BlogPost;
        class?: ClassNameValue;
    }

    let { post, class: className = "" }: Props = $props();

    const containerClasses = $derived(twMerge("flex justify-center min-h-screen", className));
    const parsedBody = $derived(marked(post.body ?? ""));
</script>

<div class={containerClasses}>
    <div class="w-full max-w-4xl p-4" id="top">
        <h1>{post.title}</h1>
        <p class="text-content pb-4">
            {post.description}
        </p>

        {#if post.cover}
            <img src={post.cover} class="big-img" alt={post.title} />
        {/if}

        <div class="meta-container pt-6">
            <div class="profile-section">
                {#if post.author?.avatar}
                    <img src={post.author.avatar} class="avatar" alt={post.author?.name} />
                {/if}
                <div class="info">
                    <p class="author-name">{post.author?.name}</p>
                    <p class="date">{post.date}</p>
                </div>
            </div>

            <ShareButton shareText={post.title ?? ""} variant="blog" />
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

    .big-img {
        width: 100%;
        max-width: 898px;
        height: 400px;
        border-radius: 16px;
        object-fit: cover;
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
