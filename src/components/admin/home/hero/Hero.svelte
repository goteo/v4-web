<script lang="ts">
    import { actions, isInputError } from "astro:actions";

    import { locale, t } from "../../../../i18n/store";
    import { formatDate, startOfDay } from "../../../../utils/dates";
    import ActionableButton from "../../../library/buttons/ActionableButton.svelte";
    import Button from "../../../library/buttons/Button.svelte";
    import Toast from "../../../library/feedback/Toast.svelte";
    import DateInput from "../../../library/inputs/DateInput.svelte";
    import ImageUploadModal from "../../../library/inputs/ImageUploadModal.svelte";
    import RichTextEditor from "../../../library/inputs/RichTextEditor.svelte";
    import TextInput from "../../../library/inputs/TextInput.svelte";
    import Title from "../../../library/typography/Title.svelte";

    import type { UploadedObject } from "../../../../utils/media/objectStorage.types";

    type FieldName =
        | "title"
        | "content"
        | "primaryCtaText"
        | "primaryCtaLink"
        | "secondaryCtaText"
        | "secondaryCtaLink"
        | "startsAt"
        | "endsAt";

    type FieldErrors = Partial<Record<FieldName, string>>;

    let formElement: HTMLFormElement;

    const contentId = $props.id();
    let content = $state("");

    let fieldErrors: FieldErrors = $state({});
    let errorMessage = $state("");
    let showError = $state(false);

    // Hero content is scheduled, so neither date may land before today.
    const today = startOfDay(new Date());

    let startsAt = $state(new Date());
    let endsAt = $state(new Date());

    // The picker compares against midnight-based days, so the start has to be
    // normalized or its own day would be greyed out in the end picker.
    const endsAtMin = $derived(startOfDay(startsAt));

    let media = $state<UploadedObject | undefined>(undefined);
    let isUploadOpen = $state(false);

    const isVideo = $derived(media?.type.startsWith("video/") ?? false);

    function handleUpload(files: UploadedObject[]) {
        media = files[0];
    }

    async function submit() {
        fieldErrors = {};

        const { error } = await actions.createHomeHero(new FormData(formElement));

        if (error) {
            if (!isInputError(error)) {
                errorMessage = error.message;
                showError = true;

                return;
            }

            fieldErrors = Object.fromEntries(
                Object.entries(error.fields).map(([field, issues]) => [field, issues?.[0]]),
            ) as FieldErrors;
        }
    }

    async function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        await submit();
    }
</script>

<form bind:this={formElement} onsubmit={handleSubmit} class="flex max-w-167 flex-col gap-10">
    <div class="flex flex-col gap-4">
        <Title level={2} variant="headline">
            {$t("pages.admin.home.hero.title")}
        </Title>
        <p class="text-content text-base font-normal">
            {$t("pages.admin.home.hero.description")}
        </p>
    </div>

    <div class="flex flex-col gap-6">
        <Title level={3} variant="subsection">
            {$t("pages.admin.home.hero.fields.textsTitle")}
        </Title>

        <div class="space-y-4">
            <TextInput
                name="title"
                required={true}
                placeholder={$t("pages.admin.home.hero.fields.titlePlaceholder")}
                error={fieldErrors.title && $t(fieldErrors.title)}
            />

            <RichTextEditor
                id={contentId}
                value={content}
                onChange={(value) => (content = value)}
                format="markdown"
                showFontSize={false}
                showAlignment={false}
                placeholder={$t("pages.admin.home.hero.fields.contentPlaceholder")}
                error={fieldErrors.content && $t(fieldErrors.content)}
            />
            <input type="hidden" name="content" value={content.trim()} />

            <div class="flex flex-col gap-6 sm:flex-row">
                <div class="flex-1">
                    <TextInput
                        name="primaryCtaText"
                        placeholder={$t("pages.admin.home.hero.fields.primaryCtaPlaceholder")}
                        error={fieldErrors.primaryCtaText && $t(fieldErrors.primaryCtaText)}
                    />
                </div>

                <div class="flex-1">
                    <TextInput
                        name="primaryCtaLink"
                        placeholder={$t("pages.admin.home.hero.fields.urlPlaceholder")}
                        error={fieldErrors.primaryCtaLink && $t(fieldErrors.primaryCtaLink)}
                    />
                </div>
            </div>

            <div class="flex flex-col gap-6 sm:flex-row">
                <div class="flex-1">
                    <TextInput
                        name="secondaryCtaText"
                        placeholder={$t("pages.admin.home.hero.fields.secondaryCtaPlaceholder")}
                        error={fieldErrors.secondaryCtaText && $t(fieldErrors.secondaryCtaText)}
                    />
                </div>

                <div class="flex-1">
                    <TextInput
                        name="secondaryCtaLink"
                        placeholder={$t("pages.admin.home.hero.fields.urlPlaceholder")}
                        error={fieldErrors.secondaryCtaLink && $t(fieldErrors.secondaryCtaLink)}
                    />
                </div>
            </div>
        </div>
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

            <Button kind="secondary" size="sm" class="w-fit" onclick={() => (isUploadOpen = true)}>
                {$t("pages.admin.home.hero.fields.mediaAdd")}
            </Button>
        </div>

        <input type="hidden" name="mediaUrl" value={media?.url ?? ""} />
        <input type="hidden" name="mediaType" value={media?.type ?? ""} />
    </div>

    <div class="flex flex-col gap-6">
        <Title level={3} variant="subsection">
            {$t("pages.admin.home.hero.fields.scheduleTitle")}
        </Title>

        <div class="flex flex-col gap-6 sm:flex-row">
            <DateInput
                bind:value={startsAt}
                class="flex-1"
                name="startsAt"
                min={today}
                placeholder={$t("pages.admin.home.hero.fields.startDatePlaceholder")}
                error={fieldErrors.startsAt &&
                    $t(fieldErrors.startsAt, { date: formatDate(today, $locale) })}
            />

            <DateInput
                bind:value={endsAt}
                class="flex-1"
                name="endsAt"
                min={endsAtMin}
                placeholder={$t("pages.admin.home.hero.fields.endDatePlaceholder")}
                error={fieldErrors.endsAt &&
                    $t(fieldErrors.endsAt, { date: formatDate(endsAtMin, $locale) })}
            />
        </div>
    </div>

    <ActionableButton action={submit} autoreset={2000} class="w-fit px-6">
        {$t("common.save")}
    </ActionableButton>
</form>

<Toast variant="error" bind:showToast={showError}>{errorMessage}</Toast>

<ImageUploadModal
    bind:open={isUploadOpen}
    accept={["image/png", "image/jpeg", "video/mp4", "video/quicktime"]}
    multiple={false}
    onConfirm={handleUpload}
/>
