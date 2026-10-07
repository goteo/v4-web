<script lang="ts">
    import { actions, isInputError } from "astro:actions";
    import { untrack } from "svelte";

    import BlogTranslationModal from "./BlogTranslationModal.svelte";
    import { languagesList } from "../../../../i18n/locales";
    import { locale, t } from "../../../../i18n/store";
    import { BLOG_BASE_LOCALE, BLOG_SECTIONS } from "../../../../utils/blog";
    import PlusIcon from "../../../icons/actions/PlusIcon.svelte";
    import Back from "../../../icons/navigation/Back.svelte";
    import ActionableButton from "../../../library/buttons/ActionableButton.svelte";
    import Button from "../../../library/buttons/Button.svelte";
    import Toast from "../../../library/feedback/Toast.svelte";
    import DateInput from "../../../library/inputs/DateInput.svelte";
    import FileUpload from "../../../library/inputs/FileUpload.svelte";
    import RadioButton from "../../../library/inputs/RadioButton.svelte";
    import RichTextEditor from "../../../library/inputs/RichTextEditor.svelte";
    import TextInput from "../../../library/inputs/TextInput.svelte";
    import TabNavigation from "../../../library/layout/TabNavigation.svelte";
    import Title from "../../../library/typography/Title.svelte";

    import type { Locale } from "../../../../i18n/locales";
    import type { BlogPostDetail, BlogPostTranslation } from "../../../../repositories/blogPosts";
    import type { BlogSection } from "../../../../utils/blog";
    import type { UploadedObject } from "../../../../utils/media/objectStorage.types";

    interface Props {
        post?: BlogPostDetail | null;
    }

    let { post = null }: Props = $props();

    // The form edits its own copy of the post; showing another one is a page load.
    const initial = untrack(() => post);

    type FieldName = "title" | "publishedAt" | "videoUrl";
    type FieldErrors = Partial<Record<FieldName, string>>;

    const listHref = $derived(`/${$locale}/admin/comm/blog`);

    let formElement: HTMLFormElement;

    const contentId = $props.id();
    let publishedAt = $state(initial?.publishedAt ?? new Date());
    let section = $state<BlogSection>(initial?.section ?? "news");
    let allowComments = $state(initial?.allowComments === false ? "0" : "1");

    // Only the URL is stored, so rebuild what FileUpload needs to list the current header.
    let header = $state<UploadedObject[]>(
        initial?.headerUrl
            ? [
                  {
                      id: initial.headerUrl,
                      url: initial.headerUrl,
                      type: initial.headerType ?? "image/jpeg",
                      size: 0,
                      name: initial.headerUrl.split("/").pop() ?? "",
                  },
              ]
            : [],
    );

    let fieldErrors: FieldErrors = $state({});
    let errorMessage = $state("");
    let showError = $state(false);

    const allLocales = Object.keys(languagesList) as Locale[];

    const emptyTexts = (): BlogPostTranslation => ({ title: "", subtitle: null, content: "" });

    // Every locale's texts live here and are saved together; the tabs pick which one is shown.
    let translations = $state<Partial<Record<Locale, BlogPostTranslation>>>(
        initial?.translations ?? { [BLOG_BASE_LOCALE]: emptyTexts() },
    );
    let activeLocale = $state<Locale>(BLOG_BASE_LOCALE);
    const active = $derived(translations[activeLocale]!);

    const addedLocales = $derived(allLocales.filter((code) => translations[code]));
    const missingLocales = $derived(allLocales.filter((code) => !translations[code]));

    let isTranslationModalOpen = $state(false);

    function addTranslation(code: Locale) {
        translations[code] = emptyTexts();
        activeLocale = code;
    }

    async function submit(publish: boolean) {
        fieldErrors = {};

        const untitled = addedLocales.find((code) => !translations[code]?.title.trim());

        if (untitled) {
            activeLocale = untitled;
            fieldErrors = { title: "system.constraint.text.notEmpty" };

            return;
        }

        const data = new FormData(formElement);

        if (publish) {
            data.set("published", "1");
        }

        const { error } = await actions.saveBlogPost(data);

        if (error) {
            if (!isInputError(error)) {
                errorMessage = error.message;
                showError = true;

                return;
            }

            // Translation issues come back under one field; the title is the only required text.
            const { translations: textIssues, ...fields } = error.fields as Record<
                string,
                string[] | undefined
            >;

            fieldErrors = Object.fromEntries(
                Object.entries({ ...fields, title: textIssues }).map(([field, issues]) => [
                    field,
                    issues?.[0],
                ]),
            ) as FieldErrors;

            return;
        }

        location.assign(listHref);
    }
</script>

<a href={listHref} class="flex w-fit items-center gap-2 py-2 font-medium text-black">
    <Back />
    <span class="text-base">{$t("common.back")}</span>
</a>

<div class="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
    <div class="flex max-w-150 flex-col gap-4">
        <Title level={2} variant="headline">
            {$t("pages.admin.comm.blog.title")}
        </Title>
        <p class="text-content text-base font-normal">
            {$t("pages.admin.comm.blog.description")}
        </p>
    </div>

    <Button
        kind="secondary"
        class="flex w-fit items-center gap-2 px-6"
        disabled={missingLocales.length === 0}
        onclick={() => (isTranslationModalOpen = true)}
    >
        <PlusIcon class="size-5" />
        {$t("pages.admin.comm.blog.form.addTranslation")}
    </Button>
</div>

<form
    bind:this={formElement}
    onsubmit={(event) => {
        event.preventDefault();
        submit(false);
    }}
    class="flex max-w-167 flex-col gap-10"
>
    {#if post}
        <input type="hidden" name="id" value={post.id} />
    {/if}
    <input
        type="hidden"
        name="translations"
        value={JSON.stringify(
            Object.fromEntries(
                Object.entries(translations).map(([code, texts]) => [
                    code,
                    { ...texts, subtitle: texts.subtitle || null, content: texts.content.trim() },
                ]),
            ),
        )}
    />
    <input type="hidden" name="published" value={post?.published ? "1" : "0"} />

    {#if addedLocales.length > 1}
        <TabNavigation
            tabs={addedLocales.map((code) => ({ id: code, label: languagesList[code] }))}
            currentTab={activeLocale}
            onTabClick={(code) => {
                activeLocale = code as Locale;
                fieldErrors = {};
            }}
        />
    {/if}

    <fieldset class="flex flex-col gap-6">
        <Title level={3} variant="subsection">
            {$t("pages.admin.comm.blog.form.titleSection")}
        </Title>
        <div class="grid gap-4 sm:grid-cols-2">
            <TextInput
                bind:value={() => active.title, (value) => (active.title = String(value))}
                required={true}
                placeholder={$t("pages.admin.comm.blog.form.titlePlaceholder")}
                error={fieldErrors.title && $t(fieldErrors.title)}
            />
            <TextInput
                bind:value={
                    () => active.subtitle ?? "", (value) => (active.subtitle = String(value))
                }
                placeholder={$t("pages.admin.comm.blog.form.subtitlePlaceholder")}
            />
        </div>
    </fieldset>

    <fieldset class="flex flex-col gap-6">
        <Title level={3} variant="subsection">
            {$t("pages.admin.comm.blog.form.authorSection")}
        </Title>
        <div class="grid gap-4 sm:grid-cols-2">
            <TextInput
                name="author"
                value={post?.author ?? ""}
                placeholder={$t("pages.admin.comm.blog.form.authorPlaceholder")}
            />
            <DateInput
                bind:value={publishedAt}
                name="publishedAt"
                placeholder={$t("pages.admin.comm.blog.form.datePlaceholder")}
                error={fieldErrors.publishedAt && $t(fieldErrors.publishedAt)}
            />
        </div>
    </fieldset>

    <fieldset class="flex flex-col gap-6">
        <Title level={3} variant="subsection">
            {$t("pages.admin.comm.blog.form.headerSection")}
        </Title>
        <FileUpload
            bind:files={header}
            multiple={false}
            maxSizeMB={20}
            accept={["image/png", "image/jpeg", "video/mp4", "video/quicktime"]}
            placeholder={$t("domain.imageUploadModal.dropzone")}
        />
        <input type="hidden" name="headerUrl" value={header[0]?.url ?? ""} />
        <input type="hidden" name="headerType" value={header[0]?.type ?? ""} />
    </fieldset>

    <fieldset class="flex flex-col gap-6">
        <Title level={3} variant="subsection">
            {$t("pages.admin.comm.blog.form.contentSection")}
        </Title>
        <RichTextEditor
            id={contentId}
            value={active.content}
            onChange={(value) => (active.content = value)}
            format="markdown"
            placeholder={$t("pages.admin.comm.blog.form.contentPlaceholder")}
        />
    </fieldset>

    <fieldset class="flex flex-col gap-6">
        <Title level={3} variant="subsection">
            {$t("pages.admin.comm.blog.form.videoSection")}
        </Title>
        <TextInput
            name="videoUrl"
            value={post?.videoUrl ?? ""}
            placeholder={$t("pages.admin.comm.blog.form.videoPlaceholder")}
            error={fieldErrors.videoUrl && $t(fieldErrors.videoUrl)}
        />
    </fieldset>

    <fieldset class="flex flex-col gap-6">
        <Title level={3} variant="subsection">
            {$t("pages.admin.comm.blog.form.sectionSection")}
        </Title>
        <div class="grid w-fit grid-cols-2 gap-x-8 gap-y-4">
            {#each BLOG_SECTIONS as value (value)}
                <RadioButton
                    name="section"
                    {value}
                    bind:group={section}
                    label={$t(`pages.admin.comm.blog.form.sections.${value}`)}
                />
            {/each}
        </div>
    </fieldset>

    <fieldset class="flex flex-col gap-6">
        <Title level={3} variant="subsection">
            {$t("pages.admin.comm.blog.form.commentsSection")}
        </Title>
        <div class="flex gap-8">
            <RadioButton
                name="allowComments"
                value="1"
                bind:group={allowComments}
                label={$t("pages.admin.comm.blog.form.commentsYes")}
            />
            <RadioButton
                name="allowComments"
                value="0"
                bind:group={allowComments}
                label={$t("pages.admin.comm.blog.form.commentsNo")}
            />
        </div>
    </fieldset>

    <div class="flex flex-wrap gap-4">
        <ActionableButton kind="secondary" action={() => submit(false)} class="w-fit px-6">
            {$t("pages.admin.comm.blog.form.saveAndExit")}
        </ActionableButton>
        <ActionableButton action={() => submit(true)} class="w-fit px-6">
            {$t("pages.admin.comm.blog.form.publish")}
        </ActionableButton>
    </div>
</form>

<BlogTranslationModal
    bind:open={isTranslationModalOpen}
    locales={missingLocales}
    onAdd={addTranslation}
/>

<Toast floating variant="error" bind:showToast={showError}>{errorMessage}</Toast>
