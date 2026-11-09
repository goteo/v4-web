<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import MotivatingProjectsSection from "./manage/MotivatingProjectsSection.svelte";
    import { languagesList } from "../../i18n/locales";
    import { locale, t } from "../../i18n/store";
    import { apiUsersIdPatch } from "../../openapi/client";
    import { getCookie, setCookie } from "../../utils/cookies";
    import { useFormDraft } from "../../utils/forms/useFormDraft.svelte";
    import ActionableButton from "../library/buttons/ActionableButton.svelte";
    import Toast from "../library/feedback/Toast.svelte";
    import Checkbox from "../library/inputs/Checkbox.svelte";
    import Select from "../library/inputs/Select.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { Category, User } from "../../openapi/client";

    interface Props {
        user: User;
        /** Categories to offer, read by the page from `apiCategoriesGetCollection` */
        categories?: Category[];
        class?: ClassNameValue;
    }

    let { user, categories = [], class: classes = "" }: Props = $props();

    let language: string = $state($locale ?? "es");
    let isAnonymous = $state(user.isAnonymous ?? false);
    let savedIsAnonymous = user.isAnonymous ?? false;
    let toast = $state(false);
    let errorToast = $state(false);
    let motivatingProjects: Category[] = $state([]);

    const CATEGORIES_COOKIE = "preferred-categories";

    /**
     * The preferences are kept while they are not saved yet: the categories picked and the
     * language chosen, which is itself one of the ways of switching the language.
     */
    const { restored } = useFormDraft("manage-preferences", () => ({
        language,
        categoryIds: motivatingProjects.map((category) => String(category.id)),
    }));

    const restoredCategoryIds = restored?.categoryIds;

    if (restored?.language) {
        language = restored.language;
    }

    if (restoredCategoryIds) {
        motivatingProjects = categories.filter((category) =>
            restoredCategoryIds.includes(String(category.id)),
        );
    }

    $effect(() => {
        const stored = getCookie(CATEGORIES_COOKIE);
        if (!stored || motivatingProjects.length > 0 || categories.length === 0) {
            return;
        }

        // A draft recovered after a language switch holds the newer choice, even when it is
        // an empty one.
        if (restoredCategoryIds) {
            return;
        }

        try {
            const ids = JSON.parse(stored) as (string | number)[];
            motivatingProjects = categories.filter((category) =>
                ids.some((id) => String(id) === String(category.id)),
            );
        } catch {
            motivatingProjects = [];
        }
    });

    /* The API has no endpoint for the preferred language: it lives in a cookie, read back by
       `src/middleware/index.ts`. Anonymity is the only preference stored on the `User`. */
    async function save() {
        setCookie("preferred-lang", language);

        const ids = motivatingProjects
            .map((category) => category.id)
            .filter((id): id is string => id !== undefined && id !== null)
            .map((id) => String(id));

        setCookie(CATEGORIES_COOKIE, JSON.stringify(ids));

        if (isAnonymous !== savedIsAnonymous) {
            const { error } = await apiUsersIdPatch({
                baseUrl: "/api/relay",
                path: { id: String(user.id) },
                body: { isAnonymous },
            });

            if (error) {
                errorToast = true;
                throw error;
            }

            savedIsAnonymous = isAnonymous;
        }

        toast = true;
    }

    function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        save();
    }
</script>

<form onsubmit={handleSubmit} class={twMerge("flex flex-col gap-8", classes)}>
    <div class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-2">
            <h1 class="font-body text-[2.5rem] leading-12 font-bold text-black">
                {$t("pages.me.manage.preferences.title")}
            </h1>
            <p class="text-content font-body text-base leading-6">
                {$t("pages.me.manage.preferences.subtitle")}
            </p>
        </div>

        <ActionableButton action={save} autoreset={3000} class="w-fit">
            {$t("pages.me.manage.preferences.save")}
        </ActionableButton>
    </div>

    <section class="flex flex-col gap-3">
        <Title level={2} variant="subsection">
            {$t("pages.me.manage.preferences.languages.title")}
        </Title>

        <div class="mt-2 flex max-w-2xl flex-col gap-4">
            <div class="w-full">
                <Select
                    name="language"
                    labelText={$t("pages.me.manage.preferences.languages.label")}
                    helperText={$t("pages.me.manage.preferences.languages.helper")}
                    bind:value={language}
                >
                    {#each Object.entries(languagesList) as [code, name] (code)}
                        <option value={code}>{name}</option>
                    {/each}
                </Select>
            </div>
        </div>
    </section>
    <section class="flex flex-col gap-3">
        <Title level={2} variant="subsection">
            {$t("pages.me.manage.preferences.privacy.title")}
        </Title>

        <Checkbox
            bind:checked={isAnonymous}
            label={$t("pages.me.manage.preferences.privacy.anonymous")}
            class="mt-2 gap-2"
        />
    </section>
    <MotivatingProjectsSection options={categories} bind:selected={motivatingProjects} />
</form>

<Toast bind:showToast={toast} variant="success">
    {$t("pages.me.manage.preferences.toast.saved")}
</Toast>
<Toast bind:showToast={errorToast} variant="error">
    {$t("pages.me.manage.preferences.toast.error")}
</Toast>
