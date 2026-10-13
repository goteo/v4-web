<script lang="ts">
    import { untrack } from "svelte";

    import { locale } from "../../i18n/store";
    import { textsIn, videoEmbedUrl } from "../../utils/blog";
    import LanguagesDropdown from "../header/LanguagesDropdown.svelte";
    import BackButton from "../library/buttons/BackButton.svelte";
    import BodyBlog from "../library/layout/BodyBlog.svelte";

    import type { BlogPost } from "../../repositories/blogPosts";

    interface Props {
        post: BlogPost;
    }

    let { post }: Props = $props();

    // Seeds the pick with the page language; the selector owns it from then on.
    let contentLocale = $state(
        untrack(() => (post.languages.includes($locale) ? $locale : post.language)),
    );

    const texts = $derived(textsIn(post, contentLocale));
</script>

<div class="wrapper">
    <div class="flex flex-col gap-6 pt-6 pb-20">
        <div class="flex items-center justify-between gap-4">
            <BackButton href={`/${$locale}/blog`} />
            {#if post.languages.length > 1}
                <LanguagesDropdown
                    languages={post.languages}
                    selected={contentLocale}
                    onSelect={(code) => (contentLocale = code)}
                />
            {/if}
        </div>

        <BodyBlog
            class="min-h-0"
            post={{
                title: texts.title,
                description: texts.subtitle ?? undefined,
                video: (post.videoUrl && videoEmbedUrl(post.videoUrl)) || undefined,
                media: post.headerMedia,
                date: post.publishedAt ?? post.dateCreated,
                author: post.author ? { name: post.author } : undefined,
                body: texts.content,
            }}
        />
    </div>
</div>
