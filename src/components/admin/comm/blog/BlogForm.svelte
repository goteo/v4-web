<script lang="ts">
    import { actions, isInputError } from "astro:actions";
    import { Modal } from "flowbite-svelte";
    import { untrack } from "svelte";

    import { locale, t } from "../../../../i18n/store";
    import { BLOG_SECTIONS } from "../../../../utils/blog";
    import { getDefaultLanguage } from "../../../../utils/consts";
    import { getLanguageDisplayName } from "../../../../utils/lang";
    import { iso639_1Codes } from "../../../../utils/lang.types";
    import LanguagesDropdown from "../../../header/LanguagesDropdown.svelte";
    import Trash from "../../../icons/actions/Trash.svelte";
    import Back from "../../../icons/navigation/Back.svelte";
    import ActionableButton from "../../../library/buttons/ActionableButton.svelte";
    import Button from "../../../library/buttons/Button.svelte";
    import DropdownMenu from "../../../library/dropdown/DropdownMenu.svelte";
    import DeleteModal from "../../../library/feedback/DeleteModal.svelte";
    import Toast from "../../../library/feedback/Toast.svelte";
    import DateInput from "../../../library/inputs/DateInput.svelte";
    import FileUpload from "../../../library/inputs/FileUpload.svelte";
    import RadioButton from "../../../library/inputs/RadioButton.svelte";
    import RichTextEditor from "../../../library/inputs/RichTextEditor.svelte";
    import TextInput from "../../../library/inputs/TextInput.svelte";
    import Title from "../../../library/typography/Title.svelte";

    import type { BlogPost } from "../../../../repositories/blogPosts";
    import type { BlogSection } from "../../../../utils/blog";
    import type { UploadedObject } from "../../../../utils/media/objectStorage.types";
    import type { DropdownOption } from "../../../library/dropdown/dropdown.types";

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

    // As in the hero, a post may be translated into any language the browser can name.
    const ALL_LANGUAGE_OPTIONS: DropdownOption[] = iso639_1Codes
        .map((code) => ({ id: code, label: getLanguageDisplayName(code) }))
        .filter((option): option is { id: string; label: string } => option.label !== undefined)
        .map((option) => ({
            id: option.id,
            label: `${option.label} (${option.id})`,
            selected: false,
        }));

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
    const primaryLanguage = $derived(
        languages.includes(defaultLanguage) ? defaultLanguage : languages[0],
    );

    let isAddModalOpen = $state(false);
    let languageSearch = $state("");
    let candidateOptions = $state<DropdownOption[]>([]);
    let selectedLanguageOption = $state<DropdownOption[]>([]);
    let isRemoveModalOpen = $state(false);

    function selectLanguage(code: string) {
        selectedLanguage = code;
        fieldErrors = {};
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

        if (!code || languages.includes(code)) {
            return;
        }

        texts[code] = emptyTexts();
        languages = [...languages, code];
        selectLanguage(code);
        isAddModalOpen = false;
    }

    function confirmRemoveLanguage() {
        delete texts[selectedLanguage];
        languages = languages.filter((code) => code !== selectedLanguage);
        selectLanguage(languages[0]);
        isRemoveModalOpen = false;
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

    <div class="flex flex-wrap items-center gap-4">
        <LanguagesDropdown {languages} selected={selectedLanguage} onSelect={selectLanguage} />

        <Button kind="secondary" size="sm" class="w-fit" onclick={openAddModal}>
            {$t("pages.admin.comm.blog.form.addTranslation")}
        </Button>

        {#if languages.length > 1}
            <Button
                kind="ghost"
                size="sm"
                class="text-tertiary w-fit"
                onclick={() => (isRemoveModalOpen = true)}
            >
                <Trash class="size-3 text-current" />
                {$t("pages.admin.comm.blog.form.removeTranslation")}
            </Button>
        {/if}
    </div>

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
            {$t("pages.admin.comm.blog.form.translationModal.title")}
        </Title>
    {/snippet}

    <div class="flex flex-col gap-6">
        <p class="text-content text-base font-normal">
            {$t("pages.admin.comm.blog.form.translationModal.description")}
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
            searchPlaceholder={$t("pages.admin.comm.blog.form.translationModal.searchPlaceholder")}
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
            {$t("pages.admin.comm.blog.form.translationModal.submit")}
        </Button>
    {/snippet}
</Modal>

<DeleteModal
    bind:open={isRemoveModalOpen}
    title={$t("pages.admin.comm.blog.form.removeTranslationModal.title")}
    description={$t("pages.admin.comm.blog.form.removeTranslationModal.description")}
    onclick={confirmRemoveLanguage}
/>

<Toast floating variant="error" bind:showToast={showError}>{errorMessage}</Toast>
