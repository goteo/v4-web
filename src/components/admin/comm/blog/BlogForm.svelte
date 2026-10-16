<script lang="ts">
    import { actions, isInputError } from "astro:actions";
    import { untrack } from "svelte";

    import { locale, t } from "../../../../i18n/store";
    import { BLOG_SECTIONS } from "../../../../utils/blog";
    import { getDefaultLanguage } from "../../../../utils/consts";
    import {
        getLanguageDisplayName,
        primaryLanguage as pickPrimaryLanguage,
    } from "../../../../utils/lang";
    import Back from "../../../icons/navigation/Back.svelte";
    import ActionableButton from "../../../library/buttons/ActionableButton.svelte";
    import Toast from "../../../library/feedback/Toast.svelte";
    import DateInput from "../../../library/inputs/DateInput.svelte";
    import FileUpload from "../../../library/inputs/FileUpload.svelte";
    import RadioButton from "../../../library/inputs/RadioButton.svelte";
    import RichTextEditor from "../../../library/inputs/RichTextEditor.svelte";
    import TextInput from "../../../library/inputs/TextInput.svelte";
    import Title from "../../../library/typography/Title.svelte";
    import TranslationLanguages from "../../TranslationLanguages.svelte";

    import type { BlogPost } from "../../../../repositories/blogPosts";
    import type { BlogSection } from "../../../../utils/blog";
    import type { UploadedObject } from "../../../../utils/media/objectStorage.types";

    interface Props {
        post?: BlogPost | null;
    }

    let { post = null }: Props = $props();

    // The form edits its own copy of the post; showing another one is a page load.
    const initial = untrack(() => post);

    type FieldName = "title" | "publishedAt" | "videoUrl";
    type FieldErrors = Partial<Record<FieldName, string>>;

    /** The texts a post has in each language. */
    interface Texts {
        title: string;
        subtitle: string;
        content: string;
    }

    const listHref = $derived(`/${$locale}/admin/comm/blog`);

    let formElement: HTMLFormElement;

    const contentId = $props.id();
    let publishedAt = $state(initial?.publishedAt ?? new Date());
    let section = $state<BlogSection>(initial?.section ?? "news");

    // Only URL and type are stored, so rebuild what FileUpload needs to list the current header.
    let header = $state<UploadedObject[]>(
        (initial?.headerMedia ?? []).map(({ url, type }) => ({
            id: url,
            url,
            type,
            size: 0,
            name: url.split("/").pop() ?? "",
        })),
    );

    let fieldErrors: FieldErrors = $state({});
    let errorMessage = $state("");
    let showError = $state(false);

    const emptyTexts = (): Texts => ({ title: "", subtitle: "", content: "" });

    const defaultLanguage = getDefaultLanguage();

    // Every language's texts live here, the base one included, and are saved together.
    let texts = $state<Record<string, Texts>>(
        initial
            ? Object.fromEntries(
                  initial.languages.map((code) => {
                      const stored =
                          code === initial.language ? initial : initial.translations[code];

                      return [
                          code,
                          {
                              title: stored?.title ?? "",
                              subtitle: stored?.subtitle ?? "",
                              content: stored?.content ?? "",
                          },
                      ];
                  }),
              )
            : { [defaultLanguage]: emptyTexts() },
    );
    let languages = $state<string[]>(initial?.languages ?? [defaultLanguage]);
    let selectedLanguage = $state(untrack(() => languages[0]));
    const active = $derived(texts[selectedLanguage]);

    // Same rule as the hero: the row is written in the platform language while it is
    // present, otherwise in the first language; the rest are stored as translations.
    const primaryLanguage = $derived(pickPrimaryLanguage(languages, defaultLanguage));

    function selectLanguage(code: string) {
        selectedLanguage = code;
        fieldErrors = {};
    }

    async function submit(publish: boolean) {
        fieldErrors = {};

        const untitled = languages.filter((code) => !texts[code].title.trim());

        if (untitled.length > 0) {
            selectLanguage(untitled[0]);
            fieldErrors = { title: "system.constraint.text.notEmpty" };
            errorMessage = $t("pages.admin.comm.blog.errors.incompleteLanguages", {
                languages: untitled.map((code) => getLanguageDisplayName(code) ?? code).join(", "),
            });
            showError = true;

            return;
        }

        const data = new FormData(formElement);
        const primary = texts[primaryLanguage];

        data.set("language", primaryLanguage);
        data.set("title", primary.title.trim());
        data.set("subtitle", primary.subtitle.trim());
        data.set("content", primary.content.trim());
        data.set(
            "translations",
            JSON.stringify(
                Object.fromEntries(
                    languages
                        .filter((code) => code !== primaryLanguage)
                        .map((code) => [
                            code,
                            {
                                title: texts[code].title.trim(),
                                subtitle: texts[code].subtitle.trim() || undefined,
                                content: texts[code].content.trim() || undefined,
                            },
                        ]),
                ),
            ),
        );

        if (publish) {
            data.set("published", "1");
        }

        const { error } = await actions.saveBlogPost(data);

        if (error) {
            if (!isInputError(error)) {
                // Unhandled failures, or a non-JSON body such as an HTML error page, arrive as
                // INTERNAL_SERVER_ERROR with raw text; only our own ActionErrors carry a message.
                errorMessage =
                    error.code === "INTERNAL_SERVER_ERROR"
                        ? $t("system.error.unknown")
                        : error.message;
                showError = true;

                return;
            }

            // Translation issues come back under one field; the title is the only required text.
            const { translations: textIssues, ...fields } = error.fields as Record<
                string,
                string[] | undefined
            >;

            fieldErrors = Object.fromEntries(
                Object.entries({ ...fields, title: fields.title ?? textIssues }).map(
                    ([field, issues]) => [field, issues?.[0]],
                ),
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

<div class="flex max-w-150 flex-col gap-4">
    <Title level={2} variant="headline">
        {$t("pages.admin.comm.blog.title")}
    </Title>
    <p class="text-content text-base font-normal">
        {$t("pages.admin.comm.blog.description")}
    </p>
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
    <input type="hidden" name="published" value={post?.published ? "1" : "0"} />

    <TranslationLanguages
        bind:languages
        bind:selected={selectedLanguage}
        onAdd={(code) => (texts[code] = emptyTexts())}
        onRemove={(code) => delete texts[code]}
        onSelect={() => (fieldErrors = {})}
    />

    <fieldset class="flex min-w-0 flex-col gap-6">
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
                bind:value={() => active.subtitle, (value) => (active.subtitle = String(value))}
                placeholder={$t("pages.admin.comm.blog.form.subtitlePlaceholder")}
            />
        </div>
    </fieldset>

    <fieldset class="flex min-w-0 flex-col gap-6">
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

    <fieldset class="flex min-w-0 flex-col gap-6">
        <Title level={3} variant="subsection">
            {$t("pages.admin.comm.blog.form.headerSection")}
        </Title>
        <FileUpload
            bind:files={header}
            multiple={true}
            maxSizeMB={20}
            accept={["image/png", "image/jpeg", "video/mp4", "video/quicktime"]}
            placeholder={$t("domain.imageUploadModal.dropzone")}
        />
        <input
            type="hidden"
            name="headerMedia"
            value={JSON.stringify(header.map(({ url, type }) => ({ url, type })))}
        />
    </fieldset>

    <fieldset class="flex min-w-0 flex-col gap-6">
        <Title level={3} variant="subsection">
            {$t("pages.admin.comm.blog.form.contentSection")}
        </Title>
        <!-- The editor only reads its value on mount, so each language gets its own. -->
        {#key selectedLanguage}
            <RichTextEditor
                id={`${contentId}-${selectedLanguage}`}
                value={active.content}
                onChange={(value) => (active.content = value)}
                format="markdown"
                placeholder={$t("pages.admin.comm.blog.form.contentPlaceholder")}
            />
        {/key}
    </fieldset>

    <fieldset class="flex min-w-0 flex-col gap-6">
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

    <fieldset class="flex min-w-0 flex-col gap-6">
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

    <div class="flex flex-wrap gap-4">
        <ActionableButton kind="secondary" action={() => submit(false)} class="w-fit px-6">
            {$t("pages.admin.comm.blog.form.saveAndExit")}
        </ActionableButton>
        <ActionableButton action={() => submit(true)} class="w-fit px-6">
            {$t("pages.admin.comm.blog.form.publish")}
        </ActionableButton>
    </div>
</form>

<Toast floating variant="error" bind:showToast={showError}>{errorMessage}</Toast>
