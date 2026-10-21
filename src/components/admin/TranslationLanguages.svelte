<script lang="ts">
    import { Modal } from "flowbite-svelte";
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import { t } from "../../i18n/store";
    import { getLanguageDisplayName, primaryLanguage } from "../../utils/lang";
    import { iso639_1Codes } from "../../utils/lang.types";
    import LanguagesDropdown from "../header/LanguagesDropdown.svelte";
    import Trash from "../icons/actions/Trash.svelte";
    import Button from "../library/buttons/Button.svelte";
    import DropdownMenu from "../library/dropdown/DropdownMenu.svelte";
    import DeleteModal from "../library/feedback/DeleteModal.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { DropdownOption } from "../library/dropdown/dropdown.types";

    interface Props {
        /** The languages the content has, in order. */
        languages: string[];
        /** The language being edited. */
        selected: string;
        /** A language was added: the form creates its empty texts. */
        onAdd: (code: string) => void;
        /** A language was removed: the form drops its texts. */
        onRemove: (code: string) => void;
        /** Another language was picked, by the user or after adding or removing one. */
        onSelect?: (code: string) => void;
        /** Whether a language may be removed; others stay in place. */
        removable?: (code: string) => boolean;
        class?: ClassNameValue;
    }

    let {
        languages = $bindable(),
        selected = $bindable(),
        onAdd,
        onRemove,
        onSelect,
        removable = () => true,
        class: classes = "",
    }: Props = $props();

    // Content may be translated into any language the browser can name.
    const ALL_LANGUAGE_OPTIONS: DropdownOption[] = iso639_1Codes.flatMap((code) => {
        const name = getLanguageDisplayName(code);
        return name ? [{ id: code, label: `${name} (${code})`, selected: false }] : [];
    });

    let isAddModalOpen = $state(false);
    let languageSearch = $state("");
    let candidateOptions = $state<DropdownOption[]>([]);
    let selectedLanguageOption = $state<DropdownOption[]>([]);
    let isRemoveModalOpen = $state(false);
    let isRemoveAllModalOpen = $state(false);

    // The language "remove all" keeps.
    const kept = $derived(primaryLanguage(languages));
    // The languages "remove all" drops.
    const removableOthers = $derived(languages.filter((code) => code !== kept && removable(code)));

    function select(code: string) {
        selected = code;
        onSelect?.(code);
    }

    function openAddModal() {
        languageSearch = "";
        selectedLanguageOption = [];
        refreshLanguageOptions();
        isAddModalOpen = true;
    }

    function refreshLanguageOptions(query = "") {
        // Once an option is picked its label fills the search; it must not filter the list.
        const search = query.trim().toLowerCase();
        const selectedLabel = ALL_LANGUAGE_OPTIONS.find(
            (option) => option.id === selectedLanguageOption[0]?.id,
        )?.label.toLowerCase();
        const needle = search && search !== selectedLabel ? search : "";

        candidateOptions = ALL_LANGUAGE_OPTIONS.filter(
            (option) =>
                !languages.includes(option.id) &&
                (!needle ||
                    option.label.toLowerCase().includes(needle) ||
                    option.id.includes(needle)),
        ).map((option) => ({ ...option, selected: selectedLanguageOption[0]?.id === option.id }));
    }

    function handleAddLanguageChange(option: DropdownOption) {
        selectedLanguageOption = [option];
        languageSearch = option.label;
        refreshLanguageOptions(option.label);
    }

    function confirmAddLanguage() {
        const code = selectedLanguageOption[0]?.id;

        if (!code) return;

        onAdd(code);
        languages = [...languages, code];
        select(code);
        isAddModalOpen = false;
    }

    function confirmRemoveLanguage() {
        const code = selected;

        languages = languages.filter((language) => language !== code);
        onRemove(code);
        select(languages[0]);
        isRemoveModalOpen = false;
    }

    function confirmRemoveAll() {
        const removed = removableOthers;

        languages = languages.filter((code) => !removed.includes(code));
        removed.forEach(onRemove);
        select(kept);
        isRemoveAllModalOpen = false;
    }
</script>

<div class={twMerge("flex flex-wrap items-center gap-4", classes)}>
    <LanguagesDropdown {languages} {selected} onSelect={select} />

    <Button kind="secondary" size="sm" class="w-fit" onclick={openAddModal}>
        {$t("domain.translationLanguages.add")}
    </Button>

    {#if languages.length > 1 && removable(selected)}
        <Button
            kind="ghost"
            size="sm"
            class="text-tertiary w-fit"
            onclick={() => (isRemoveModalOpen = true)}
        >
            <Trash class="size-3 text-current" />
            {$t("domain.translationLanguages.remove")}
        </Button>
    {/if}

    {#if removableOthers.length > 0}
        <Button
            kind="ghost"
            size="sm"
            class="text-tertiary w-fit"
            onclick={() => (isRemoveAllModalOpen = true)}
        >
            <Trash class="size-3 text-current" />
            {$t("domain.translationLanguages.removeAll")}
        </Button>
    {/if}
</div>

<Modal
    bind:open={isAddModalOpen}
    closeBtnClass="top-3 end-3 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex w-full max-w-178 -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-visible rounded-3xl border-b-0 bg-white p-6 shadow-lg backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    headerClass="border-b-0 md:p-0 p-0"
    bodyClass="md:p-0 p-0 overflow-y-visible border-b-0"
    footerClass="md:p-0 p-0 flex items-center justify-end gap-4 border-b-0"
>
    {#snippet header()}
        <Title level={2} variant="subsection">
            {$t("domain.translationLanguages.addModal.title")}
        </Title>
    {/snippet}

    <div class="flex flex-col gap-6">
        <p class="text-content text-base font-normal">
            {$t("domain.translationLanguages.addModal.description")}
        </p>

        <DropdownMenu
            variant="basic"
            singleSelect
            hasSearch
            bind:searchValue={languageSearch}
            bind:options={candidateOptions}
            bind:selected={selectedLanguageOption}
            onSearch={(query) => refreshLanguageOptions(query)}
            onChange={handleAddLanguageChange}
            searchPlaceholder={$t("domain.translationLanguages.addModal.searchPlaceholder")}
            itemClass="text-start"
        />
    </div>

    {#snippet footer()}
        <Button kind="ghost" onclick={() => (isAddModalOpen = false)} class="w-fit">
            {$t("common.cancel")}
        </Button>
        <Button
            onclick={confirmAddLanguage}
            class="w-fit"
            disabled={selectedLanguageOption.length === 0}
        >
            {$t("domain.translationLanguages.addModal.submit")}
        </Button>
    {/snippet}
</Modal>

<DeleteModal
    bind:open={isRemoveModalOpen}
    title={$t("domain.translationLanguages.removeModal.title")}
    description={$t("domain.translationLanguages.removeModal.description")}
    onclick={confirmRemoveLanguage}
/>

<DeleteModal
    bind:open={isRemoveAllModalOpen}
    title={$t("domain.translationLanguages.removeAllModal.title")}
    description={$t("domain.translationLanguages.removeAllModal.description", {
        language: getLanguageDisplayName(kept) ?? kept,
    })}
    onclick={confirmRemoveAll}
/>
