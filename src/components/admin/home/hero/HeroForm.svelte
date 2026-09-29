<script lang="ts">
    import { actions, isInputError } from "astro:actions";
    import { Modal } from "flowbite-svelte";

    import { locale, t } from "../../../../i18n/store";
    import { getDefaultLanguage } from "../../../../utils/consts";
    import { formatDate, startOfDay } from "../../../../utils/dates";
    import { getLanguageDisplayName } from "../../../../utils/lang";
    import { iso639_1Codes } from "../../../../utils/lang.types";
    import LanguagesDropdown from "../../../header/LanguagesDropdown.svelte";
    import Trash from "../../../icons/actions/Trash.svelte";

    import HeroPreviewModal from "./HeroPreviewModal.svelte";
    import Eye from "../../../icons/media/Eye.svelte";
    import ActionableButton from "../../../library/buttons/ActionableButton.svelte";
    import Button from "../../../library/buttons/Button.svelte";
    import DropdownMenu from "../../../library/dropdown/DropdownMenu.svelte";
    import type { DropdownOption } from "../../../library/dropdown/dropdown.types";
    import Toast from "../../../library/feedback/Toast.svelte";
    import DeleteModal from "../../../library/feedback/DeleteModal.svelte";
    import DateInput from "../../../library/inputs/DateInput.svelte";
    import ImageUploadModal from "../../../library/inputs/ImageUploadModal.svelte";
    import RichTextEditor from "../../../library/inputs/RichTextEditor.svelte";
    import TextInput from "../../../library/inputs/TextInput.svelte";
    import Title from "../../../library/typography/Title.svelte";

    import type { HomeHeroRecord } from "../../../../repositories/homeHero";
    import type { UploadedObject } from "../../../../utils/media/objectStorage.types";

    interface Props {
        hero?: HomeHeroRecord | null;
        onSaved?: () => void;
    }

    let { hero = null, onSaved }: Props = $props();

    /** The six text fields that exist per language. */
    interface HeroFields {
        title: string;
        content: string;
        primaryCtaText: string;
        primaryCtaLink: string;
        secondaryCtaText: string;
        secondaryCtaLink: string;
    }

    // The admin may translate into ANY recognized language, not only the locales
    // the UI itself is available in. The catalog covers all ISO 639-1 codes the
    // browser can name; the search narrows it, unknown codes are not offered.
    const ALL_LANGUAGE_OPTIONS: DropdownOption[] = iso639_1Codes
        .map((code) => ({ id: code, label: getLanguageDisplayName(code) }))
        .filter((option): option is { id: string; label: string } => option.label !== undefined)
        .map((option) => ({
            id: option.id,
            label: `${option.label} (${option.id})`,
            selected: false,
        }));

    function emptyFields(): HeroFields {
        return {
            title: "",
            content: "",
            primaryCtaText: "",
            primaryCtaLink: "",
            secondaryCtaText: "",
            secondaryCtaLink: "",
        };
    }

    function fieldsFromRecord(record: HomeHeroRecord): HeroFields {
        return {
            title: record.title,
            content: record.content,
            primaryCtaText: record.primaryCtaText ?? "",
            primaryCtaLink: record.primaryCtaLink ?? "",
            secondaryCtaText: record.secondaryCtaText ?? "",
            secondaryCtaLink: record.secondaryCtaLink ?? "",
        };
    }

    type HeroMedia = Pick<UploadedObject, "url" | "type" | "name">;

    type FieldName =
        | "title"
        | "content"
        | "primaryCtaText"
        | "primaryCtaLink"
        | "secondaryCtaText"
        | "secondaryCtaLink"
        | "startsAt";

    type FieldErrors = Partial<Record<FieldName, string>>;

    let formElement: HTMLFormElement;

    const contentId = $props.id();

    // All languages are equal: there is no "base" language, only a default one
    // (the platform language) used to seed the form. An existing block keeps
    // the language it was authored in, and the default can be removed like any
    // other language once a second one exists.
    const defaultLanguage = getDefaultLanguage();
    const initialLanguage = hero?.language || defaultLanguage;

    let languages = $state<string[]>([initialLanguage]);
    let selectedLanguage = $state<string>(initialLanguage);

    let isAddModalOpen = $state(false);
    let languageSearch = $state("");
    let candidateOptions = $state<DropdownOption[]>([]);
    let selectedLanguageOption = $state<DropdownOption[]>([]);

    let isRemoveModalOpen = $state(false);

    let fieldValues = $state<Record<string, HeroFields>>({
        [initialLanguage]: hero ? fieldsFromRecord(hero) : emptyFields(),
    });

    // The stored row must be authored in exactly one language. The platform
    // language keeps that role while it is present; otherwise the first chosen
    // language becomes the authoring language.
    const primaryLanguage = $derived(
        languages.includes(defaultLanguage) ? defaultLanguage : (languages[0] ?? defaultLanguage),
    );

    let fieldErrors: FieldErrors = $state({});
    let errorMessage = $state("");
    let showError = $state(false);

    const today = startOfDay(new Date());

    let startsAt = $state(new Date());

    let media = $state<HeroMedia | undefined>(storedMedia(hero));
    let isUploadOpen = $state(false);

    let isPreviewOpen = $state(false);
    let previewHero = $state<HomeHeroRecord | null>(null);

    const isVideo = $derived(media?.type.startsWith("video/") ?? false);

    function storedMedia(record: HomeHeroRecord | null): HeroMedia | undefined {
        if (!record?.mediaUrl || !record.mediaType) {
            return undefined;
        }

        return {
            url: record.mediaUrl,
            type: record.mediaType,
            name: record.mediaUrl.split("/").pop() ?? record.mediaUrl,
        };
    }

    function openAddModal() {
        languageSearch = "";
        selectedLanguageOption = [];
        refreshLanguageOptions();
        isAddModalOpen = true;
    }

    function refreshLanguageOptions(query = "") {
        // After picking an option its label is shown in the search input; that
        // label must not act as a filter, otherwise reopening the list would
        // narrow it to the selected language alone.
        const search = query.trim().toLowerCase();
        const selectedLabel = ALL_LANGUAGE_OPTIONS.find(
            (option) => option.id === selectedLanguageOption[0]?.id,
        )?.label.toLowerCase();
        const active = search && search !== selectedLabel ? search : "";

        candidateOptions = ALL_LANGUAGE_OPTIONS.filter(
            (option) =>
                !languages.includes(option.id) &&
                (!active ||
                    option.label.toLowerCase().includes(active) ||
                    option.id.includes(active)),
        ).map((option) => ({
            ...option,
            selected: selectedLanguageOption[0]?.id === option.id,
        }));
    }

    function handleAddLanguageChange(option: DropdownOption) {
        selectedLanguageOption = [option];
        languageSearch = option.label;
        refreshLanguageOptions(option.label);
    }

    function confirmAddLanguage() {
        const lang = selectedLanguageOption[0]?.id;

        if (!lang || languages.includes(lang)) {
            return;
        }

        if (!fieldValues[lang]) {
            fieldValues[lang] = emptyFields();
        }

        languages = [...languages, lang];
        selectedLanguage = lang;
        languageSearch = "";
        selectedLanguageOption = [];
        isAddModalOpen = false;
    }

    function openRemoveModal() {
        // Any language can be removed, but at least one must remain.
        if (languages.length > 1) {
            isRemoveModalOpen = true;
        }
    }

    function confirmRemoveLanguage() {
        delete fieldValues[selectedLanguage];
        languages = languages.filter((lang) => lang !== selectedLanguage);
        selectedLanguage = languages[0] ?? defaultLanguage;
        isRemoveModalOpen = false;
    }

    const currentFields = $derived(
        fieldValues[selectedLanguage] ?? fieldValues[primaryLanguage],
    );

    function openPreview() {
        previewHero = {
            id: 0,
            language: selectedLanguage,
            title: currentFields.title.trim(),
            content: currentFields.content,
            primaryCtaText: currentFields.primaryCtaText.trim() || null,
            primaryCtaLink: currentFields.primaryCtaLink.trim() || null,
            secondaryCtaText: currentFields.secondaryCtaText.trim() || null,
            secondaryCtaLink: currentFields.secondaryCtaLink.trim() || null,
            mediaUrl: media?.url ?? null,
            mediaType: media?.type ?? null,
            startsAt,
            dateCreated: new Date(),
        };
        isPreviewOpen = true;
    }

    function handleUpload(files: UploadedObject[]) {
        media = files[0];
    }

    function validate(): boolean {
        const errors: FieldErrors = {};
        const primary = fieldValues[primaryLanguage] ?? emptyFields();

        if (!primary.title.trim()) {
            errors.title = "system.constraint.text.notEmpty";
        }

        if (!primary.content.trim()) {
            errors.content = "system.constraint.text.notEmpty";
        }

        fieldErrors = errors;

        return Object.keys(errors).length === 0;
    }

    async function submit() {
        fieldErrors = {};

        if (!validate()) {
            return;
        }

        const data = new FormData(formElement);

        const primary = fieldValues[primaryLanguage] ?? emptyFields();

        data.set("language", primaryLanguage);
        data.set("title", primary.title.trim());
        data.set("content", primary.content.trim());
        data.set("primaryCtaText", primary.primaryCtaText.trim());
        data.set("primaryCtaLink", primary.primaryCtaLink.trim());
        data.set("secondaryCtaText", primary.secondaryCtaText.trim());
        data.set("secondaryCtaLink", primary.secondaryCtaLink.trim());

        const translations: Record<string, HeroFields> = {};

        for (const lang of languages) {
            if (lang === primaryLanguage) {
                continue;
            }

            const fields = fieldValues[lang];

            if (!fields) {
                continue;
            }

            translations[lang] = {
                title: fields.title.trim(),
                content: fields.content.trim(),
                primaryCtaText: fields.primaryCtaText.trim(),
                primaryCtaLink: fields.primaryCtaLink.trim(),
                secondaryCtaText: fields.secondaryCtaText.trim(),
                secondaryCtaLink: fields.secondaryCtaLink.trim(),
            };
        }

        if (Object.keys(translations).length > 0) {
            data.set("translations", JSON.stringify(translations));
        }

        try {
            const { error } = await actions.createHomeHero(data);

            if (error) {
                if (!isInputError(error)) {
                    errorMessage = error.message;
                    showError = true;

                    return;
                }

                fieldErrors = Object.fromEntries(
                    Object.entries(error.fields).map(([field, issues]) => [field, issues?.[0]]),
                ) as FieldErrors;

                return;
            }
        } catch (e) {
            // The action call itself threw (e.g. a network failure); do not
            // let ActionableButton swallow it silently.
            errorMessage = e instanceof Error ? e.message : String(e);
            showError = true;

            return;
        }

        try {
            onSaved?.();
        } catch (e) {
            // Refreshing the history must not be reported as a save failure.
            console.error(e);
        }
    }

    async function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        await submit();
    }
</script>

{#snippet textFields(fields: HeroFields)}
    <div class="space-y-4">
        <TextInput
            value={fields.title}
            onInput={(value) => (fields.title = String(value))}
            required={selectedLanguage === primaryLanguage}
            placeholder={$t("pages.admin.home.hero.fields.titlePlaceholder")}
            error={fieldErrors.title && $t(fieldErrors.title)}
        />

        <RichTextEditor
            id={`${contentId}-${selectedLanguage}`}
            value={fields.content}
            onChange={(value) => (fields.content = value)}
            format="markdown"
            showFontSize={false}
            showAlignment={false}
            placeholder={$t("pages.admin.home.hero.fields.contentPlaceholder")}
            error={fieldErrors.content && $t(fieldErrors.content)}
        />

        <div class="flex flex-col gap-6 sm:flex-row">
            <div class="flex-1">
                <TextInput
                    value={fields.primaryCtaText}
                    onInput={(value) => (fields.primaryCtaText = String(value))}
                    placeholder={$t("pages.admin.home.hero.fields.primaryCtaPlaceholder")}
                    error={fieldErrors.primaryCtaText && $t(fieldErrors.primaryCtaText)}
                />
            </div>

            <div class="flex-1">
                <TextInput
                    value={fields.primaryCtaLink}
                    onInput={(value) => (fields.primaryCtaLink = String(value))}
                    placeholder={$t("pages.admin.home.hero.fields.urlPlaceholder")}
                    error={fieldErrors.primaryCtaLink && $t(fieldErrors.primaryCtaLink)}
                />
            </div>
        </div>

        <div class="flex flex-col gap-6 sm:flex-row">
            <div class="flex-1">
                <TextInput
                    value={fields.secondaryCtaText}
                    onInput={(value) => (fields.secondaryCtaText = String(value))}
                    placeholder={$t("pages.admin.home.hero.fields.secondaryCtaPlaceholder")}
                    error={fieldErrors.secondaryCtaText && $t(fieldErrors.secondaryCtaText)}
                />
            </div>

            <div class="flex-1">
                <TextInput
                    value={fields.secondaryCtaLink}
                    onInput={(value) => (fields.secondaryCtaLink = String(value))}
                    placeholder={$t("pages.admin.home.hero.fields.urlPlaceholder")}
                    error={fieldErrors.secondaryCtaLink && $t(fieldErrors.secondaryCtaLink)}
                />
            </div>
        </div>
    </div>
{/snippet}

<form bind:this={formElement} onsubmit={handleSubmit} class="flex max-w-167 flex-col gap-10">
    <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-4">
            <LanguagesDropdown
                {languages}
                selected={selectedLanguage}
                onSelect={(lang) => (selectedLanguage = lang)}
            />

            <Button kind="secondary" size="sm" class="w-fit" onclick={openAddModal}>
                {$t("pages.admin.home.hero.addTranslation")}
            </Button>

            {#if languages.length > 1}
                <Button
                    kind="ghost"
                    size="sm"
                    class="text-tertiary w-fit"
                    onclick={openRemoveModal}
                >
                    <Trash class="size-3 text-current" />
                    {$t("pages.admin.home.hero.removeTranslation")}
                </Button>
            {/if}
        </div>
    </div>

    <div class="flex flex-col gap-6">
        <Title level={3} variant="subsection">
            {$t("pages.admin.home.hero.fields.textsTitle")}
        </Title>

        {#key selectedLanguage}
            {@render textFields(fieldValues[selectedLanguage] ?? fieldValues[primaryLanguage])}
        {/key}
    </div>

    <div class="flex flex-col gap-6">
        <Title level={3} variant="subsection">
            {$t("pages.admin.home.hero.fields.mediaTitle")}
        </Title>

        <div
            class="border-grey flex w-full flex-col gap-6 rounded-2xl border bg-white p-6 shadow-sm sm:max-w-138"
        >
            <div class="flex flex-col">
                <p class="text-secondary text-base font-bold">
                    {$t("pages.admin.home.hero.fields.mediaLabel")}
                </p>

                {#if media}
                    <p class="text-content truncate text-base font-normal">{media.name}</p>
                {:else}
                    <p class="text-content text-base font-normal">
                        {$t("pages.admin.home.hero.fields.mediaHint")}
                    </p>
                {/if}
            </div>

            {#if media}
                {#if isVideo}
                    <!-- svelte-ignore a11y_media_has_caption -->
                    <video src={media.url} controls class="w-full rounded-lg"></video>
                {:else}
                    <img src={media.url} alt={media.name} class="w-full rounded-lg" />
                {/if}
            {/if}

            <div class="flex flex-wrap gap-4">
                <Button
                    kind="secondary"
                    size="sm"
                    class="w-fit"
                    onclick={() => (isUploadOpen = true)}
                >
                    {$t("pages.admin.home.hero.fields.mediaAdd")}
                </Button>

                {#if media}
                    <Button
                        kind="ghost"
                        size="sm"
                        class="w-fit"
                        onclick={() => (media = undefined)}
                    >
                        {$t("common.remove")}
                    </Button>
                {/if}
            </div>
        </div>

        <input type="hidden" name="mediaUrl" value={media?.url ?? ""} />
        <input type="hidden" name="mediaType" value={media?.type ?? ""} />
    </div>

    <div class="flex flex-col gap-6">
        <Title level={3} variant="subsection">
            {$t("pages.admin.home.hero.fields.scheduleTitle")}
        </Title>

        <DateInput
            bind:value={startsAt}
            class="sm:max-w-80"
            name="startsAt"
            min={today}
            placeholder={$t("pages.admin.home.hero.fields.startDatePlaceholder")}
            error={fieldErrors.startsAt &&
                $t(fieldErrors.startsAt, { date: formatDate(today, $locale) })}
        />
    </div>

    <div class="flex flex-wrap gap-4">
        <ActionableButton action={submit} autoreset={2000} class="w-fit px-6">
            {$t("common.save")}
        </ActionableButton>

        <Button kind="ghost" class="flex w-fit items-center gap-2 px-6" onclick={openPreview}>
            <Eye class="size-5 text-current" />
            {$t("common.preview")}
        </Button>
    </div>
</form>

<HeroPreviewModal bind:open={isPreviewOpen} hero={previewHero} />

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
            {$t("pages.admin.home.hero.addTranslationModal.title")}
        </Title>
    {/snippet}

    <div class="flex flex-col gap-6">
        <p class="text-content text-base font-normal">
            {$t("pages.admin.home.hero.addTranslationModal.description")}
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
            searchPlaceholder={$t("pages.admin.home.hero.addTranslationModal.searchPlaceholder")}
            itemClass="text-start"
        />
    </div>

    {#snippet footer()}
        <Button kind="ghost" onclick={() => (isAddModalOpen = false)} class="w-fit">
            {$t("common.cancel")}
        </Button>
        <Button onclick={confirmAddLanguage} class="w-fit" disabled={selectedLanguageOption.length === 0}>
            {$t("pages.admin.home.hero.addTranslationModal.submit")}
        </Button>
    {/snippet}
</Modal>

<DeleteModal
    bind:open={isRemoveModalOpen}
    title={$t("pages.admin.home.hero.removeTranslationModal.title")}
    description={$t("pages.admin.home.hero.removeTranslationModal.description")}
    onclick={confirmRemoveLanguage}
/>

<Toast variant="error" bind:showToast={showError}>{errorMessage}</Toast>

<ImageUploadModal
    bind:open={isUploadOpen}
    accept={["image/png", "image/jpeg", "video/mp4", "video/quicktime"]}
    multiple={false}
    onConfirm={handleUpload}
/>
