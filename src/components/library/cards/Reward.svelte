<script lang="ts">
    import { twJoin, twMerge, type ClassNameValue } from "tailwind-merge";

    import { t } from "../../../i18n/store";
    import { formatCurrency } from "../../../utils/currencies";
    import { renderMarkdown } from "../../../utils/renderMarkdown";
    import Title from "../typography/Title.svelte";

    import type { ProjectReward } from "../../../openapi/client";
    import type { Snippet } from "svelte";

    let {
        reward,
        variant = "full",
        disabled = false,
        coverClass = "",
        class: classes = "",
        children,
        stats,
    }: {
        reward: ProjectReward;
        variant?: "full" | "compact";
        disabled?: boolean;
        coverClass?: ClassNameValue;
        class?: ClassNameValue;
        children: Snippet;
        stats?: Snippet;
    } = $props();
</script>

<svelte:element
    this={variant === "compact" ? "li" : "div"}
    class={twMerge(
        "border-grey flex basis-1/3 flex-col justify-between gap-4 rounded-4xl border bg-white p-6 shadow-[0px_1px_3px_0px_#0000001A] md:gap-6",
        disabled && "cursor-not-allowed opacity-50",
        classes,
    )}
>
    {#if variant === "full" && reward.cover}
        <img
            src={reward.cover}
            alt={reward.title}
            class={twMerge("h-40 w-full rounded-3xl object-cover", coverClass)}
        />
    {/if}

    <div class="flex min-w-0 flex-col gap-4">
        {#if variant === "full"}
            <Title
                level={3}
                variant="subsection"
                color="secondary"
                weight="bold"
                truncate={2}
                class="w-full text-left"
            >
                <div>
                    {@html $t(
                        "domain.project.reward.byAtLeast",
                        {
                            amount: formatCurrency(reward.money.amount, reward.money.currency),
                        },
                        { allowHTML: true },
                    )}
                </div>
                {reward.title}
            </Title>
        {:else}
            <Title
                level={3}
                variant="subsection"
                color="secondary"
                weight="bold"
                truncate={2}
                class="w-full text-left"
            >
                {reward.title}
            </Title>
        {/if}

        {#if reward.description}
            <div
                class="marked-content line-clamp-6 max-h-[11.2em] overflow-hidden mask-[linear-gradient(to_bottom,black_80%,transparent)] text-sm whitespace-pre-line text-gray-800"
            >
                <div class="min-w-0">
                    {#await renderMarkdown(reward.description) then description}
                        {@html description}
                    {/await}
                </div>
            </div>
        {/if}
    </div>

    {#if variant === "full" && stats}
        <div class="mt-auto flex w-full justify-between">
            {@render stats()}
        </div>
    {/if}

    <div class={twJoin("flex w-full flex-col gap-4", variant !== "full" && "mt-auto")}>
        {@render children()}
    </div>
</svelte:element>
