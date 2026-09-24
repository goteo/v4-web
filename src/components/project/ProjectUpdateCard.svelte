<script lang="ts">
    import { twMerge } from "tailwind-merge";

    import Bullet from "../../components/icons/Bullet.svelte";
    import { t } from "../../i18n/store";
    import { locale } from "../../i18n/store";
    import { apiUsersIdOrHandleGet, type ProjectUpdate } from "../../openapi/client/index";
    import { formatDate } from "../../utils/dates.ts";
    import { extractId } from "../../utils/extractId.ts";
    import { renderMarkdown } from "../../utils/renderMarkdown";
    import Button from "../library/buttons/Button.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { User } from "../../openapi/client/types.gen.ts";
    import type { MouseEventHandler } from "svelte/elements";

    export type ProjectUpdateCardType = "contracted" | "expanded" | "mobile";

    const cardStyles = {
        contracted: "h-[24.5rem] w-[21.75rem] gap-6",
        expanded: "h-[24.5rem] w-[30.75rem] gap-6",
        mobile: "h-[25.625rem] w-[13.5rem] gap-3",
    };

    const mediaGroupStyles = {
        contracted: "flex flex-col gap-4",
        expanded: "flex shrink-0 flex-col gap-4",
        mobile: "flex shrink-0 flex-col gap-3",
    };

    const dateStyles = {
        contracted: "shrink-0 text-2xl",
        expanded: "text-2xl",
        mobile: "text-2xl",
    };

    const imageStyles = {
        contracted: "rounded-3xl",
        expanded: "rounded-3xl",
        mobile: "rounded-2xl",
    };

    const contentGroupStyles = {
        contracted: "gap-4",
        expanded: "gap-4",
        mobile: "gap-2",
    };

    const titleStyles = {
        contracted: "line-clamp-1 text-double leading-7",
        expanded: "line-clamp-1 text-xl leading-7",
        mobile: "line-clamp-2 text-lg leading-5",
    };

    const bodyStyles = {
        contracted: "text-base text-ellipsis",
        expanded: "text-base text-ellipsis",
        mobile: "text-[0.6875rem]",
    };

    const footerStyles = {
        contracted: "items-end justify-between gap-3",
        expanded: "items-end justify-between gap-3",
        mobile: "flex-col gap-3",
    };

    const authorStyles = {
        contracted: "line-clamp-1 text-xs",
        expanded: "text-xs",
        mobile: "line-clamp-1 text-center text-[0.6875rem]",
    };

    interface Props {
        update: ProjectUpdate;
        type?: ProjectUpdateCardType;
        onClick?: MouseEventHandler<HTMLButtonElement> | undefined;
        isActive?: boolean;
    }

    let { update, type = "contracted", onClick, isActive }: Props = $props();

    let author: User | undefined = $state(undefined);

    async function getAuthor(update: ProjectUpdate): Promise<User | undefined> {
        const authorId: string | null = extractId(update.author!);
        if (!authorId) return undefined;

        const { data: user, error: err } = await apiUsersIdOrHandleGet({
            path: { idOrHandle: authorId },
        });

        if (err) {
            throw new Error(err.description!);
        }

        return user;
    }

    $effect(() => {
        getAuthor(update).then((data) => (author = data));
    });
</script>

<div
    class={twMerge(
        "flex shrink-0 flex-col overflow-hidden rounded-[1.25rem] border border-grey bg-white p-4 shadow-sm transition-[width,opacity,box-shadow] duration-300 ease-out",
        cardStyles[type],
        isActive && "opacity-100",
    )}
>
    <div class={mediaGroupStyles[type]}>
        <div
            class={twMerge(
                "text-secondary flex flex-row gap-0.5 leading-6 font-bold",
                dateStyles[type],
            )}
        >
            {#if update.date}
                {formatDate(new Date(update.date), $locale)}
            {/if}
            <Bullet size={3} />
        </div>
        {#if update.cover}
            <img
                src={update.cover}
                alt={update.title}
                class={twMerge(
                    "no-select h-[268.6px] w-full shrink-0 self-stretch object-cover",
                    imageStyles[type],
                )}
                draggable="false"
            />
        {/if}
    </div>
    <div class="flex min-h-0 flex-1 flex-col justify-between gap-6">
        <div class={twMerge("flex flex-col", contentGroupStyles[type])}>
            <Title level={2} variant="subsection" color="secondary" class={titleStyles[type]}>
                {update.title}
            </Title>
            {#if update.subtitle || update.body}
                <div class="flex flex-col gap-2 leading-5">
                    <p class="line-clamp-2 text-base font-bold text-black">{update.subtitle}</p>
                    <p class={twMerge("text-content line-clamp-2 font-normal", bodyStyles[type])}>
                        {#await renderMarkdown(update.body) then content}
                            {@html content}
                        {/await}
                    </p>
                </div>
            {/if}
        </div>
        <div class={twMerge("flex w-full", footerStyles[type])}>
            <span class={twMerge("text-content font-medium", authorStyles[type])}>
                {$t("pages.project.view.tabs.updates.by")}
                <strong class="font-bold text-black"> {author?.displayName}</strong>
            </span>
            <Button kind="ghost" onclick={onClick}>
                {$t("pages.project.view.tabs.updates.content.btn.readMore")}
            </Button>
        </div>
    </div>
</div>
