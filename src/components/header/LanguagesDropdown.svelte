<script lang="ts">
    import { clickOutside } from "flowbite-svelte";

    import { getLanguageDisplayName } from "../../utils/lang";
    import LanguageIcon from "../icons/LanguageIcon.svelte";
    import Chevron from "../icons/navigation/Chevron.svelte";

    interface LanguagesDropdownProps {
        /**
         * List of available ISO 639-1 language codes for selection
         */
        languages: string[];
        /**
         * Language code of the selected language
         */
        selected: string;
        onSelect?: (language: string) => void;
    }

    let { languages, selected, onSelect }: LanguagesDropdownProps = $props();

    let open = $state(false);

    function selectLanguage(code: string) {
        open = false;
        onSelect?.(code);
    }
    function toggleDropdown() {
        open = !open;
    }
</script>

<div
    class="relative inline-block w-full text-left lg:max-w-max"
    use:clickOutside={() => (open = false)}
>
    <button
        type="button"
        class="flex w-full items-center gap-2 rounded-md border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-100"
        onclick={toggleDropdown}
        aria-haspopup="true"
        aria-expanded={open}
    >
        <LanguageIcon />
        <span class="flex-1 text-left">{getLanguageDisplayName(selected)}</span>
        <Chevron direction={open ? "up" : "down"} width="16" height="16" />
    </button>

    {#if open}
        <div
            class="absolute z-10 mt-1 max-h-96 w-full overflow-scroll rounded-md border border-gray-200 bg-white shadow-md"
        >
            {#each languages as lang (lang)}
                <button
                    type="button"
                    class="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-100"
                    onclick={() => selectLanguage(lang)}
                >
                    {getLanguageDisplayName(lang)}
                </button>
            {/each}
        </div>
    {/if}
</div>
