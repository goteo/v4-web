<script lang="ts">
    import { actions, isInputError } from "astro:actions";
    import { untrack } from "svelte";

    import { locale, t } from "../../../../i18n/store";
    import { getDefaultLanguage } from "../../../../utils/consts";
    import { endOfDay, formatDate, startOfDay } from "../../../../utils/dates";
    import { getLanguageDisplayName, primaryLanguage } from "../../../../utils/lang";
    import ActionableButton from "../../../library/buttons/ActionableButton.svelte";
    import Toast from "../../../library/feedback/Toast.svelte";
    import DateInput from "../../../library/inputs/DateInput.svelte";
    import TextArea from "../../../library/inputs/TextArea.svelte";
    import TextInput from "../../../library/inputs/TextInput.svelte";
    import Title from "../../../library/typography/Title.svelte";
    import TranslationLanguages from "../../TranslationLanguages.svelte";

    import type { Banner, BannerTexts } from "../../../../repositories/banners";

    interface Props {
        banner?: Banner | null;
        onSaved?: () => void;
    }

    let { banner = null, onSaved }: Props = $props();

    // The form edits its own copy of the banner.
    const initial = untrack(() => banner);

    type FieldName = keyof BannerTexts | "startsAt" | "endsAt";

    type FieldErrors = Partial<Record<FieldName, string>>;

    let fieldErrors: FieldErrors = $state({});
    let errorMessage = $state("");
    let showError = $state(false);

    let startsAt = $state(initial?.startsAt ?? new Date());
    let endsAt = $state(initial?.endsAt ?? new Date());

    const emptyTexts = (): BannerTexts => ({ title: "", content: "", ctaText: "", ctaLink: "" });

    const defaultLanguage = getDefaultLanguage();

    // Every language's texts live here, the base one included, and are saved together.
    let texts = $state<Record<string, BannerTexts>>(
        initial
            ? Object.fromEntries(
                  initial.languages.map((code) => [
                      code,
                      {
                          ...emptyTexts(),
                          ...(code === initial.language ? initial : initial.translations[code]),
                      },
                  ]),
              )
            : { [defaultLanguage]: emptyTexts() },
    );
    let languages = $state<string[]>(initial?.languages ?? [defaultLanguage]);
    let selectedLanguage = $state(untrack(() => languages[0]));
    const active = $derived(texts[selectedLanguage]);

    /**
     * Normalize a date field to the human expected true datetime
     * @param field
     * @param date
     */
    function normalizeDate(field: "startsAt" | "endsAt", date: Date): Date {
        const now = new Date();
        const isToday =
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate();

        // Ends always run to the end of their day. Start dates run from their
        // midnight, except when the day is today the current time is used so it
        // passes the "no earlier than now" validation. DateInput binds the same
        // object, so the normalized time is applied in place.
        const normalized = field === "endsAt" ? endOfDay(date) : isToday ? now : startOfDay(date);

        date.setTime(normalized.getTime());

        return date;
    }

    function textsOf(code: string): BannerTexts {
        const { title, content, ctaText, ctaLink } = texts[code];

        return {
            title: title.trim(),
            content: content.trim(),
            ctaText: ctaText.trim(),
            ctaLink: ctaLink.trim(),
        };
    }

    async function submit() {
        fieldErrors = {};

        const incomplete = languages.filter((code) => Object.values(textsOf(code)).some((v) => !v));

        if (incomplete.length > 0) {
            selectedLanguage = incomplete[0];
            fieldErrors = Object.fromEntries(
                Object.entries(textsOf(incomplete[0]))
                    .filter(([, value]) => !value)
                    .map(([field]) => [field, "system.constraint.text.notEmpty"]),
            );
            errorMessage = $t("pages.admin.comm.banners.errors.incompleteLanguages", {
                languages: incomplete
                    .map((code) => getLanguageDisplayName(code) ?? code)
                    .join(", "),
            });
            showError = true;

            return;
        }

        const primary = primaryLanguage(languages, defaultLanguage);
        const data = new FormData();

        if (initial) {
            data.set("id", String(initial.id));
        }

        data.set("language", primary);
        Object.entries(textsOf(primary)).forEach(([field, value]) => data.set(field, value));
        data.set(
            "translations",
            JSON.stringify(
                Object.fromEntries(
                    languages
                        .filter((code) => code !== primary)
                        .map((code) => [code, textsOf(code)]),
                ),
            ),
        );
        data.set("startsAt", startsAt.toISOString());
        data.set("endsAt", endsAt.toISOString());

        const { error } = await actions.saveBanner(data);

        if (error) {
            if (!isInputError(error)) {
                errorMessage =
                    error.code === "INTERNAL_SERVER_ERROR"
                        ? $t("system.error.unknown")
                        : error.message;
                showError = true;

                return;
            }

            // Translation issues come back under one field; the texts were checked above.
            fieldErrors = Object.fromEntries(
                Object.entries(error.fields).map(([field, issues]) => [field, issues?.[0]]),
            ) as FieldErrors;

            return;
        }

        onSaved?.();
    }
</script>

<form
    onsubmit={(event) => {
        event.preventDefault();
        submit();
    }}
    class="max-w-167 space-y-10"
>
    <TranslationLanguages
        bind:languages
        bind:selected={selectedLanguage}
        onAdd={(code) => (texts[code] = emptyTexts())}
        onRemove={(code) => delete texts[code]}
        onSelect={() => (fieldErrors = {})}
    />

    <div class="flex flex-col gap-6">
        <Title level={3} variant="subsection">
            {$t("pages.admin.comm.banners.fields.dataTitle")}
        </Title>

        <div class="space-y-4">
            <TextInput
                class="flex-1"
                bind:value={active.title}
                required={true}
                placeholder={$t("pages.admin.comm.banners.fields.titlePlaceholder")}
                error={fieldErrors.title && $t(fieldErrors.title)}
            />

            <TextArea
                class="flex-1"
                bind:value={active.content}
                placeholder={$t("pages.admin.comm.banners.fields.contentPlaceholder")}
                error={fieldErrors.content && $t(fieldErrors.content)}
            />

            <div class="flex gap-6">
                <div class="flex-1">
                    <TextInput
                        bind:value={active.ctaText}
                        placeholder={$t("pages.admin.comm.banners.fields.ctaPlaceholder")}
                        error={fieldErrors.ctaText && $t(fieldErrors.ctaText)}
                    />
                </div>

                <div class="flex-1">
                    <TextInput
                        bind:value={active.ctaLink}
                        placeholder={$t("pages.admin.comm.banners.fields.urlPlaceholder")}
                        error={fieldErrors.ctaLink && $t(fieldErrors.ctaLink)}
                    />
                </div>
            </div>
        </div>
    </div>

    <div class="space-y-6">
        <Title level={3} variant="subsection">
            {$t("pages.admin.comm.banners.fields.scheduleTitle")}
        </Title>

        <div class="flex gap-6">
            <DateInput
                bind:value={startsAt}
                class="flex-1"
                name="startsAt"
                placeholder={$t("pages.admin.comm.banners.fields.startDatePlaceholder")}
                error={fieldErrors.startsAt &&
                    $t(fieldErrors.startsAt, { date: formatDate(new Date(), $locale) })}
                onInput={(date) => (startsAt = normalizeDate("startsAt", date))}
            />

            <DateInput
                bind:value={endsAt}
                class="flex-1"
                name="endsAt"
                placeholder={$t("pages.admin.comm.banners.fields.endDatePlaceholder")}
                error={fieldErrors.endsAt &&
                    $t(fieldErrors.endsAt, { date: formatDate(new Date(), $locale) })}
                onInput={(date) => (endsAt = normalizeDate("endsAt", date))}
            />
        </div>
    </div>

    <ActionableButton action={submit} autoreset={2000}>
        {$t("common.save")}
    </ActionableButton>
</form>

<Toast floating variant="error" bind:showToast={showError}>{errorMessage}</Toast>
