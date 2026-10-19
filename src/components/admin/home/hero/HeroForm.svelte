<script lang="ts">
    import { actions, isInputError } from "astro:actions";

    import HeroPreviewModal from "./HeroPreviewModal.svelte";
    import { locale, t } from "../../../../i18n/store";
    import { getDefaultLanguage } from "../../../../utils/consts";
    import { formatDate, startOfDay } from "../../../../utils/dates";
    import {
        getLanguageDisplayName,
        primaryLanguage as pickPrimaryLanguage,
    } from "../../../../utils/lang";
    import Eye from "../../../icons/media/Eye.svelte";
    import ActionableButton from "../../../library/buttons/ActionableButton.svelte";
    import Button from "../../../library/buttons/Button.svelte";
    import Toast from "../../../library/feedback/Toast.svelte";
    import DateInput from "../../../library/inputs/DateInput.svelte";
    import ImageUploadModal from "../../../library/inputs/ImageUploadModal.svelte";
    import RichTextEditor from "../../../library/inputs/RichTextEditor.svelte";
    import TextInput from "../../../library/inputs/TextInput.svelte";
    import Title from "../../../library/typography/Title.svelte";
    import TranslationLanguages from "../../TranslationLanguages.svelte";

    import type { HeroTranslations, HomeHeroRecord } from "../../../../repositories/homeHero";
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

    function fieldsFromTranslations(
        overrides: NonNullable<HomeHeroRecord["translations"]>[string] | undefined,
    ): HeroFields {
        return {
            title: overrides?.title ?? "",
            content: overrides?.content ?? "",
            primaryCtaText: overrides?.primaryCtaText ?? "",
            primaryCtaLink: overrides?.primaryCtaLink ?? "",
            secondaryCtaText: overrides?.secondaryCtaText ?? "",
            secondaryCtaLink: overrides?.secondaryCtaLink ?? "",
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
    // (the platform language) used to seed a blank block. An existing block is
    // opened with every language it is available in, prefilled from its stored
    // translations, and the default can be removed like any other language
    // once a second one exists.
    const defaultLanguage = getDefaultLanguage();
    const baseLanguage = hero?.language || defaultLanguage;
    const languagesSeed = hero
        ? [
              ...new Set([
                  baseLanguage,
                  ...(hero.languages ?? []).filter((code) => code !== baseLanguage),
              ]),
          ]
        : [defaultLanguage];

    const initialFieldValues: Record<string, HeroFields> = {};
    for (const lang of languagesSeed) {
        initialFieldValues[lang] =
            lang === baseLanguage && hero
                ? fieldsFromRecord(hero)
                : fieldsFromTranslations(hero?.translations?.[lang]);
    }

    let languages = $state<string[]>(languagesSeed);
    let selectedLanguage = $state<string>(languagesSeed[0]);

    let fieldValues = $state<Record<string, HeroFields>>(initialFieldValues);

    // The stored row must be authored in exactly one language. The platform
    // language keeps that role while it is present; otherwise the first chosen
    // language becomes the authoring language.
    const primaryLanguage = $derived(pickPrimaryLanguage(languages, defaultLanguage));

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

    const currentFields = $derived(fieldValues[selectedLanguage] ?? fieldValues[primaryLanguage]);

    function openPreview() {
        // The preview carries every selected language so the modal can switch
        // between them; languages other than the one being edited are stored as
        // translations, mirroring how a persisted block looks.
        const translations: HeroTranslations = {};

        for (const lang of languages) {
            if (lang === selectedLanguage) {
                continue;
            }

            const fields = fieldValues[lang];

            if (!fields) {
                continue;
            }

            translations[lang] = {
                title: fields.title || undefined,
                content: fields.content || undefined,
                primaryCtaText: fields.primaryCtaText.trim() || undefined,
                primaryCtaLink: fields.primaryCtaLink.trim() || undefined,
                secondaryCtaText: fields.secondaryCtaText.trim() || undefined,
                secondaryCtaLink: fields.secondaryCtaLink.trim() || undefined,
            };
        }

        const previewTranslations = Object.keys(translations).length > 0 ? translations : undefined;

        previewHero = {
            id: hero?.id ?? 0,
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
            languages: languages,
            translations: previewTranslations,
        };
        isPreviewOpen = true;
    }

    function handleUpload(files: UploadedObject[]) {
        media = files[0];
    }

    function validate(): boolean {
        const errors: FieldErrors = {};
        const missingLanguages = new Set<string>();

        for (const lang of languages) {
            const fields = fieldValues[lang];

            if (!fields?.title.trim() || !fields?.content.trim()) {
                missingLanguages.add(lang);
            }

            if (lang === selectedLanguage) {
                if (!fields?.title.trim()) {
                    errors.title = "system.constraint.text.notEmpty";
                }

                if (!fields?.content.trim()) {
                    errors.content = "system.constraint.text.notEmpty";
                }
            }
        }

        fieldErrors = errors;

        if (missingLanguages.size > 0) {
            errorMessage = $t("pages.admin.home.hero.errors.incompleteLanguages", {
                languages: [...missingLanguages]
                    .map((code) => getLanguageDisplayName(code) ?? code)
                    .join(", "),
            });
            showError = true;

            return false;
        }

        return true;
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

        if (typeof hero?.id === "number") {
            data.set("id", String(hero.id));
        }

        try {
            const { error } =
                typeof hero?.id === "number"
                    ? await actions.updateHomeHero(data)
                    : await actions.createHomeHero(data);

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
            required
            placeholder={$t("pages.admin.home.hero.fields.titlePlaceholder")}
            error={fieldErrors.title && $t(fieldErrors.title)}
        />

        <RichTextEditor
            id={`${contentId}-${selectedLanguage}`}
            value={fields.content}
            onChange={(value) => (fields.content = value)}
            format="markdown"
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
    <TranslationLanguages
        bind:languages
        bind:selected={selectedLanguage}
        onAdd={(lang) => (fieldValues[lang] ??= emptyFields())}
        onRemove={(lang) => delete fieldValues[lang]}
    />

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

<Toast floating variant="error" bind:showToast={showError}>{errorMessage}</Toast>

<ImageUploadModal
    bind:open={isUploadOpen}
    accept={["image/png", "image/jpeg", "video/mp4", "video/quicktime"]}
    multiple={false}
    onConfirm={handleUpload}
/>
