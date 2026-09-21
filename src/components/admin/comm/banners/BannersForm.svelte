<script lang="ts">
    import { actions, isInputError } from "astro:actions";

    import { locale, t } from "../../../../i18n/store";
    import { endOfDay, formatDate, startOfDay } from "../../../../utils/dates";
    import ActionableButton from "../../../library/buttons/ActionableButton.svelte";
    import DateInput from "../../../library/inputs/DateInput.svelte";
    import TextArea from "../../../library/inputs/TextArea.svelte";
    import TextInput from "../../../library/inputs/TextInput.svelte";
    import Title from "../../../library/typography/Title.svelte";

    interface Props {
        onSubmit?: (event: SubmitEvent) => void;
    }

    let { onSubmit }: Props = $props();

    let formElement: HTMLFormElement;

    type FieldName = "title" | "content" | "ctaText" | "ctaLink" | "startsAt" | "endsAt";

    type FieldErrors = Partial<Record<FieldName, string>>;

    let fieldErrors: FieldErrors = $state({});

    let startsAt = $state(new Date());
    let endsAt = $state(new Date());

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

    async function submit() {
        fieldErrors = {};

        const { error } = await actions.createBanner(new FormData(formElement));

        if (error) {
            // Only validation errors carry fields; FORBIDDEN and BAD_REQUEST
            // come back as a bare message and are not reported here.
            const errors = isInputError(error) ? error.fields : {};

            fieldErrors = Object.fromEntries(
                Object.entries(errors).map(([field, issues]) => [field, issues?.[0]]),
            ) as FieldErrors;

            return;
        }
    }

    async function handleSubmit(event: SubmitEvent) {
        if (onSubmit) {
            onSubmit(event);
            return;
        }

        event.preventDefault();
        await submit();
    }
</script>

<form bind:this={formElement} onsubmit={handleSubmit} class="max-w-167 space-y-10">
    <div class="flex flex-col gap-6">
        <Title level={3} variant="subsection">
            {$t("pages.admin.comm.banners.fields.dataTitle")}
        </Title>

        <div class="space-y-4">
            <TextInput
                class="flex-1"
                name="title"
                required={true}
                placeholder={$t("pages.admin.comm.banners.fields.titlePlaceholder")}
                error={fieldErrors.title && $t(fieldErrors.title)}
            />

            <TextArea
                class="flex-1"
                name="content"
                placeholder={$t("pages.admin.comm.banners.fields.contentPlaceholder")}
                error={fieldErrors.content && $t(fieldErrors.content)}
            />

            <div class="flex gap-6">
                <div class="flex-1">
                    <TextInput
                        name="ctaText"
                        placeholder={$t("pages.admin.comm.banners.fields.ctaPlaceholder")}
                        error={fieldErrors.ctaText && $t(fieldErrors.ctaText)}
                    />
                </div>

                <div class="flex-1">
                    <TextInput
                        name="ctaLink"
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
