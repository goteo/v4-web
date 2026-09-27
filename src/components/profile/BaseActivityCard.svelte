<script lang="ts">
    import { t } from "../../i18n/store";
    import Title from "../library/typography/Title.svelte";

    import type { Snippet } from "svelte";

    interface Props {
        /**
         * Card title translation key
         */
        titleKey: string;

        /**
         * Left stat label translation key
         */
        leftStatLabel: string;

        /**
         * Left stat value (formatted)
         */
        leftStatValue: string | number;

        /**
         * Right stat label translation key
         */
        rightStatLabel: string;

        /**
         * Right stat value (formatted)
         */
        rightStatValue: string;

        /**
         * Recent items section title translation key
         */
        recentTitleKey: string;

        /**
         * Path to decorative illustration
         */
        illustrationPath: string;

        /**
         * Primary action button label translation key
         */
        primaryActionLabel: string;

        /**
         * Primary action button href
         */
        primaryActionHref: string;

        /**
         * Secondary action button label translation key
         * Optional: hidden when empty (used to disable the donation-certificate button in the open-core).
         */
        secondaryActionLabel?: string;

        /**
         * Secondary action button href
         * Optional: hidden when empty (used to disable the donation-certificate button in the open-core).
         */
        secondaryActionHref?: string;

        /**
         * Whether the card is in empty state
         */
        isEmpty?: boolean;

        /**
         * Empty state message translation key
         */
        emptyMessageKey?: string;

        /**
         * Empty state CTA label translation key
         */
        emptyCtaLabel?: string;

        /**
         * Empty state CTA link
         */
        emptyCtaLink?: string;

        /**
         * Optional children (slot content) for filled state
         */
        children?: Snippet;
    }

    let {
        titleKey,
        leftStatLabel,
        leftStatValue,
        rightStatLabel,
        rightStatValue,
        recentTitleKey,
        illustrationPath,
        primaryActionLabel,
        primaryActionHref,
        secondaryActionLabel,
        secondaryActionHref,
        isEmpty = false,
        emptyMessageKey,
        emptyCtaLabel,
        emptyCtaLink,
        children,
    }: Props = $props();
</script>

{#if isEmpty}
    <!-- Empty State -->
    <div
        class="border-grey relative flex min-h-96 flex-col items-center justify-between overflow-clip rounded-4xl border bg-white p-6"
    >
        <!-- Decorative illustration - positioned exactly as in Figma -->
        <div
            class="absolute top-[calc(50%+48.5px)] left-[calc(50%-126px)] size-97.25 -translate-x-1/2 -translate-y-1/2 opacity-[0.04]"
            style="color: #462949;"
            aria-hidden="true"
        >
            <img
                src={illustrationPath}
                alt=""
                class="size-full object-contain"
                aria-hidden="true"
            />
        </div>

        <!-- Content - centered and takes up available space -->
        <div class="relative z-10 flex grow flex-col items-center justify-center gap-1 text-center">
            <Title level={2} variant="subsection">
                {$t(titleKey)}
            </Title>
            {#if emptyMessageKey}
                <p class="text-content text-base">
                    {$t(emptyMessageKey)}
                </p>
            {/if}
        </div>

        <!-- Actions -->
        {#if emptyCtaLabel && emptyCtaLink}
            <div class="relative z-10 flex w-full gap-4">
                <a
                    href={emptyCtaLink}
                    class="bg-variant1 text-secondary focus:ring-secondary flex grow items-center justify-center gap-2 rounded-3xl px-6 py-4 text-base font-bold no-underline transition-opacity hover:opacity-90 focus:ring-2 focus:outline-none"
                >
                    {$t(emptyCtaLabel)}
                </a>
            </div>
        {/if}
    </div>
{:else}
    <!-- Filled State -->
    <div
        class="border-grey relative flex min-h-96 flex-col justify-between overflow-clip rounded-4xl border bg-white p-6"
    >
        <div class="flex gap-4">
            <div class="flex flex-1 flex-col">
                <!-- Header with title -->
                <div class="relative z-10 mb-4">
                    <h2 class="text-2xl font-bold text-black">
                        {$t(titleKey)}
                    </h2>
                </div>

                <!-- Stats section -->
                <div class="relative z-10 mb-4 flex items-start gap-4">
                    <div class="flex flex-1 flex-col gap-1">
                        <p class="text-content text-xs font-medium">
                            {$t(leftStatLabel)}
                        </p>
                        <p class="text-2xl font-bold text-black">
                            {leftStatValue}
                        </p>
                    </div>
                    <div class="flex flex-1 flex-col gap-1">
                        <p class="text-content text-xs font-medium">
                            {$t(rightStatLabel)}
                        </p>
                        <p class="text-2xl font-bold text-black">
                            {rightStatValue}
                        </p>
                    </div>
                </div>
            </div>
            <!-- Decorative illustration - top right corner -->
            <div class="z-0 size-22">
                <img
                    src={illustrationPath}
                    alt=""
                    class="size-full object-contain"
                    aria-hidden="true"
                />
            </div>
        </div>

        <!-- Recent items list -->
        <div class="relative z-10 mb-4 flex min-h-30 flex-grow flex-col gap-3">
            <Title level={3} variant="field">
                {$t(recentTitleKey)}
            </Title>
            <ul class="flex flex-col gap-2">
                {@render children?.()}
            </ul>
        </div>

        <!-- Actions -->
        <div class="relative z-10 flex w-full flex-col gap-3 md:flex-row md:gap-4">
            <a
                href={primaryActionHref}
                class="border-secondary text-secondary hover:bg-secondary/10 focus:ring-secondary flex grow items-center justify-center gap-2 overflow-hidden rounded-3xl border bg-transparent px-6 py-3 text-sm font-bold no-underline transition-colors focus:ring-2 focus:outline-none md:py-4 md:text-base"
            >
                <span class="truncate whitespace-nowrap">{$t(primaryActionLabel)}</span>
            </a>
            <!-- GOTEO-OC-DONATION-CERTIFICATE: secondary action (donation certificate) hidden in the
                 open-core; re-enable with the button when the feature toggle exists. Do not delete.
            <a
                href={secondaryActionHref}
                class="bg-variant1 text-secondary focus:ring-secondary flex grow items-center justify-center gap-2 overflow-hidden rounded-3xl px-6 py-3 text-sm font-bold no-underline transition-opacity hover:opacity-90 focus:ring-2 focus:outline-none md:py-4 md:text-base"
            >
                <span class="truncate whitespace-nowrap">{$t(secondaryActionLabel)}</span>
            </a> -->
        </div>
    </div>
{/if}
