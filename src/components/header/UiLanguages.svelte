<script lang="ts">
    import { clickOutside } from "flowbite-svelte";

    import { languagesList } from "../../i18n/locales";
    import { locale } from "../../i18n/store";
    import { persistFormDrafts } from "../../stores/formDraftsStore";
    import { setCookie } from "../../utils/cookies";
    import { getLanguageDisplayName } from "../../utils/lang";
    import Chevron from "../icons/navigation/Chevron.svelte";

    const languages = Object.keys(languagesList) as (keyof typeof languagesList)[];

    let open = $state(false);

    function handleSelect(lang: string) {
        open = false;

        if (!languages.includes(lang as keyof typeof languagesList)) {
            console.error(`Language "${lang}" not supported.`);
            return;
        }

        // The page is about to be replaced by one in another language, so what the forms
        // hold is written down first.
        persistFormDrafts();

        setCookie("preferred-lang", lang);

        let pathParts = window.location.pathname.split("/").filter(Boolean);
        if (languages.includes(pathParts[0] as keyof typeof languagesList)) {
            pathParts.shift();
        }
        pathParts.unshift(lang);
        window.location.href = `/${pathParts.join("/")}`;
    }
</script>

<div class="relative inline-block" use:clickOutside={() => (open = false)}>
    <button
        type="button"
        class="flex items-center gap-1 rounded-lg border-none bg-white px-3 py-1.5 font-bold shadow-sm hover:bg-gray-50"
        onclick={() => (open = !open)}
        aria-haspopup="listbox"
        aria-expanded={open}
    >
        {getLanguageDisplayName($locale) ?? $locale}
        <span class="transition-transform duration-200 {open ? 'rotate-180' : 'rotate-0'}">
            <Chevron direction="down" width="16" height="16" />
        </span>
    </button>

    {#if open}
        <ul
            role="listbox"
            class="absolute right-0 z-50 mt-1 min-w-full rounded-md border border-gray-200 bg-white py-1 shadow-md"
        >
            {#each languages as lang (lang)}
                <li>
                    <button
                        type="button"
                        role="option"
                        aria-selected={lang === $locale}
                        class="w-full px-3 py-2 text-left font-medium hover:bg-gray-100 {lang ===
                        $locale
                            ? 'text-primary-600 font-bold'
                            : ''}"
                        onclick={() => handleSelect(lang)}
                    >
                        {getLanguageDisplayName(lang) ?? lang}
                    </button>
                </li>
            {/each}
        </ul>
    {/if}
</div>
