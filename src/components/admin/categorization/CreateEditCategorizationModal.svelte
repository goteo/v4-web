<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import { session } from "../../../auth/store";
    import { t } from "../../../i18n/store";
    import {
        apiCategoriesIdDelete,
        apiCategoriesIdOrSlugGet,
        apiCategoriesIdPatch,
        apiCategoriesPost,
        apiThemesIdDelete,
        apiThemesIdOrSlugGet,
        apiThemesIdPatch,
        apiThemesPost,
        type Category,
        type Theme,
    } from "../../../openapi/client/index.ts";
    import { getDefaultLanguage } from "../../../utils/consts";
    import {
        getLanguageDisplayName,
        primaryLanguage as pickPrimaryLanguage,
    } from "../../../utils/lang";
    import Button from "../../library/buttons/Button.svelte";
    import TextInput from "../../library/inputs/TextInput.svelte";
    import Title from "../../library/typography/Title.svelte";
    import TranslationLanguages from "../TranslationLanguages.svelte";

    let {
        open = $bindable(false),
        mode = "create",
        type = "category",
        item = null,
        onSaved,
    }: {
        open: boolean;
        mode: "create" | "edit";
        type: "category" | "theme";
        item?: Category | Theme | null;
        onSaved?: () => Promise<void> | void;
    } = $props();

    const defaultLanguage = getDefaultLanguage();

    interface Texts {
        name: string;
    }

    const emptyTexts = (): Texts => ({ name: "" });

    let languages = $state<string[]>([defaultLanguage]);
    let selectedLanguage = $state(defaultLanguage);
    let texts = $state<Record<string, Texts>>({ [defaultLanguage]: emptyTexts() });

    let originalLocales = $state<string[]>([]);
    let originalId = $state<string | null>(null);
    let originalSlug = $state<string | null>(null);

    let isLoading = $state(false);
    let isSubmitting = $state(false);
    let errorMessage = $state("");

    const active = $derived(texts[selectedLanguage] ?? emptyTexts());

    let requestId = 0;

    function authHeaders(): Record<string, string> {
        return Object.assign(
            { Accept: "application/ld+json" },
            ($session?.token.asHttpHeaders as Record<string, string>) ?? {},
        );
    }

    function initCreate() {
        requestId++;
        languages = [defaultLanguage];
        selectedLanguage = defaultLanguage;
        texts = { [defaultLanguage]: emptyTexts() };
        originalLocales = [];
        originalId = null;
        originalSlug = null;
        isLoading = false;
        isSubmitting = false;
        errorMessage = "";
    }

    async function initEdit(target: Category | Theme) {
        const locales = target.locales?.length ? [...target.locales] : [defaultLanguage];
        const token = ++requestId;

        originalLocales = locales;
        originalId = target.id ?? null;
        originalSlug = target.slug ?? null;
        languages = locales;
        selectedLanguage = locales[0];
        texts = Object.fromEntries(
            locales.map((code) => [code, { name: code === locales[0] ? (target.name ?? "") : "" }]),
        );
        isSubmitting = false;
        errorMessage = "";
        isLoading = Boolean(target.id);

        if (!target.id) return;

        try {
            let failed = false;

            const names = await Promise.all(
                locales.map(async (code): Promise<[string, string]> => {
                    const options = {
                        baseUrl: "/api/relay",
                        path: { idOrSlug: target.id! },
                        headers: { ...authHeaders(), "Accept-Language": code },
                    };
                    const { data, error } =
                        type === "category"
                            ? await apiCategoriesIdOrSlugGet(options)
                            : await apiThemesIdOrSlugGet(options);

                    if (error) {
                        failed = true;
                        console.error(`Failed to load ${type} translation "${code}":`, error);
                        return [code, ""];
                    }

                    return [code, data?.name ?? ""];
                }),
            );

            if (token !== requestId) return;

            texts = Object.fromEntries(names.map(([code, name]) => [code, { name }]));

            if (failed) {
                errorMessage = $t("pages.admin.categorization.errors.loadFailed");
            }
        } catch (error) {
            console.error(`Failed to load ${type} translations:`, error);

            if (token === requestId) {
                errorMessage = $t("pages.admin.categorization.errors.loadFailed");
            }
        } finally {
            if (token === requestId) isLoading = false;
        }
    }

    $effect(() => {
        if (!open) return;

        if (mode === "create") {
            initCreate();
        } else if (item) {
            void initEdit(item);
        }
    });

    function textFor(code: string): string {
        return texts[code]?.name.trim() ?? "";
    }

    async function saveTranslation(id: string, code: string, name: string): Promise<void> {
        const options = {
            baseUrl: "/api/relay",
            path: { id },
            body: { name },
            headers: { ...authHeaders(), "Content-Language": code },
        };

        if (type === "category") {
            await apiCategoriesIdPatch(options);
        } else {
            await apiThemesIdPatch(options);
        }
    }

    async function deleteTranslation(id: string, code: string): Promise<void> {
        const options = {
            baseUrl: "/api/relay",
            path: { id },
            headers: { ...authHeaders(), "Content-Language": code },
        };

        if (type === "category") {
            await apiCategoriesIdDelete(options);
        } else {
            await apiThemesIdDelete(options);
        }
    }

    async function handleSubmit() {
        errorMessage = "";

        const missing = languages.filter((code) => !textFor(code));

        if (missing.length > 0) {
            selectedLanguage = missing[0];
            errorMessage = $t("pages.admin.categorization.errors.incompleteLanguages", {
                languages: missing.map((code) => getLanguageDisplayName(code) ?? code).join(", "),
            });
            return;
        }

        isSubmitting = true;

        try {
            const primary = pickPrimaryLanguage(languages, defaultLanguage);
            const translations = languages.filter((code) => code !== primary);

            if (mode === "create") {
                const { data, error } =
                    type === "category"
                        ? await apiCategoriesPost({
                              baseUrl: "/api/relay",
                              body: { name: textFor(primary) },
                              headers: { ...authHeaders(), "Content-Language": primary },
                          })
                        : await apiThemesPost({
                              baseUrl: "/api/relay",
                              body: { name: textFor(primary) },
                              headers: { ...authHeaders(), "Content-Language": primary },
                          });

                if (error || !data?.id) {
                    throw error ?? new Error("The resource was created without an identifier");
                }

                for (const code of translations) {
                    await saveTranslation(data.id, code, textFor(code));
                }
            } else if (originalId) {
                for (const code of languages) {
                    await saveTranslation(originalId, code, textFor(code));
                }

                for (const code of originalLocales.filter((code) => !languages.includes(code))) {
                    await deleteTranslation(originalId, code);
                }
            }

            await onSaved?.();
            open = false;
        } catch (error) {
            console.error("Failed to save categorization item:", error);
            errorMessage = $t("pages.admin.categorization.errors.saveFailed");
        } finally {
            isSubmitting = false;
        }
    }
</script>

<Modal
    bind:open
    closeBtnClass="top-3 end-3 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-visible rounded-3xl border-b-0 bg-white p-6 shadow-lg backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    headerClass="border-b-0 md:p-0 p-0"
    bodyClass="md:p-0 p-0 overflow-y-visible border-b-0"
    footerClass="md:p-0 p-0 flex items-center justify-end gap-4 border-b-0"
>
    {#snippet header()}
        <Title level={2} variant="subsection">
            {mode === "create"
                ? type === "category"
                    ? $t("pages.admin.categorization.modal.createCategory")
                    : $t("pages.admin.categorization.modal.createTheme")
                : type === "category"
                  ? $t("pages.admin.categorization.modal.editCategory")
                  : $t("pages.admin.categorization.modal.editTheme")}
        </Title>
    {/snippet}

    <div class="flex flex-col gap-6">
        <TranslationLanguages
            bind:languages
            bind:selected={selectedLanguage}
            onAdd={(code) => (texts[code] = emptyTexts())}
            onRemove={(code) => delete texts[code]}
            onSelect={() => (errorMessage = "")}
        />

        <div class="flex flex-col gap-2">
            <span class="text-content text-sm font-medium">
                {$t("pages.admin.categorization.modal.name")}
            </span>
            <TextInput
                bind:value={() => active.name, (value) => (active.name = String(value))}
                placeholder={$t("pages.admin.categorization.modal.name")}
                disabled={isLoading || isSubmitting}
            />
        </div>

        {#if mode === "edit" && (originalSlug || originalId)}
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div class="flex flex-col gap-1">
                    <span class="text-content text-sm font-medium">
                        {$t("pages.admin.categorization.modal.slug")}
                    </span>
                    <span class="text-secondary text-sm">{originalSlug ?? "—"}</span>
                </div>
                <div class="flex flex-col gap-1">
                    <span class="text-content text-sm font-medium">
                        {$t("pages.admin.categorization.modal.locales")}
                    </span>
                    <span class="text-secondary text-sm">
                        {originalLocales.join(", ") || "—"}
                    </span>
                </div>
            </div>
        {/if}

        {#if errorMessage}
            <p class="text-tertiary text-sm">{errorMessage}</p>
        {/if}
    </div>

    {#snippet footer()}
        <Button kind="ghost" onclick={() => (open = false)} class="w-fit" disabled={isSubmitting}>
            {$t("pages.admin.categorization.modal.cancel")}
        </Button>
        <Button onclick={handleSubmit} class="w-fit" disabled={isLoading || isSubmitting}>
            {$t("pages.admin.categorization.modal.save")}
        </Button>
    {/snippet}
</Modal>
