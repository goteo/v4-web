<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import { renderMarkdown } from "../../../../utils/renderMarkdown";
    import Hero from "../../../hero/Hero.svelte";
    import LanguagesDropdown from "../../../header/LanguagesDropdown.svelte";
    import { getLanguageDisplayName } from "../../../../utils/lang";

    import type { HomeHeroRecord } from "../../../../repositories/homeHero";

    interface Props {
        open?: boolean;
        hero: HomeHeroRecord | null;
    }

    let { open = $bindable(false), hero }: Props = $props();

    const availableLanguages = $derived(hero?.languages ?? (hero?.language ? [hero.language] : []));

    let previewLanguage = $state("");

    // Until the effect below picks the block's base language, the editor wants
    // to switch with. previewLanguage is "", so fall back to a valid code to
    // avoid passing an empty tag to Intl.DisplayNames while rendering.
    const resolvedLanguage = $derived(
        previewLanguage || hero?.language || availableLanguages[0] || "",
    );

    // Reset to the base language whenever another block is opened.
    $effect(() => {
        if (hero) {
            previewLanguage = hero.language || availableLanguages[0] || "";
        }
    });

    const previewHero = $derived.by(() => {
        if (!hero) {
            return null;
        }

        const language = resolvedLanguage;
        const overrides = hero.translations?.[language] ?? {};

        return {
            ...hero,
            language,
            title: overrides.title || hero.title,
            content: overrides.content || hero.content,
            primaryCtaText: overrides.primaryCtaText ?? hero.primaryCtaText,
            primaryCtaLink: overrides.primaryCtaLink ?? hero.primaryCtaLink,
            secondaryCtaText: overrides.secondaryCtaText ?? hero.secondaryCtaText,
            secondaryCtaLink: overrides.secondaryCtaLink ?? hero.secondaryCtaLink,
        };
    });
</script>

<Modal
    bind:open
    closeBtnClass="top-7 end-7 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex w-full max-w-[90vw] -translate-x-1/2 -translate-y-1/2 divide-y-0 rounded-3xl bg-white shadow-lg backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    bodyClass="p-0"
>
    {#if hero}
        <div class="flex max-h-[90vh] flex-col">
            <div
                class="flex items-center justify-end gap-4 border-b border-gray-100 p-4 sm:max-w-[calc(100%-7rem)]"
            >
                {#if availableLanguages.length > 1}
                    <LanguagesDropdown
                        languages={availableLanguages}
                        selected={resolvedLanguage}
                        onSelect={(lang) => (previewLanguage = lang)}
                    />
                {:else}
                    <span class="text-content text-base font-normal">
                        {getLanguageDisplayName(availableLanguages[0]) ?? availableLanguages[0]}
                    </span>
                {/if}
            </div>

            <div class="overflow-y-auto">
                {#if previewHero}
                    {#await renderMarkdown(previewHero.content) then html}
                        <Hero hero={previewHero} content={html} />
                    {/await}
                {/if}
            </div>
        </div>
    {/if}
</Modal>
