<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import MotivatingProjectsSection from "./manage/MotivatingProjectsSection.svelte";
    import { languagesList } from "../../i18n/locales";
    import { locale, t } from "../../i18n/store";
    import { getCookie, setCookie } from "../../utils/cookies";
    import ActionableButton from "../library/buttons/ActionableButton.svelte";
    import Toast from "../library/feedback/Toast.svelte";
    import Select from "../library/inputs/Select.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { Category } from "../../openapi/client";

    interface Props {
        /** Categories to offer, read by the page from `apiCategoriesGetCollection` */
        categories?: Category[];
        class?: ClassNameValue;
    }

    let { categories = [], class: classes = "" }: Props = $props();

    let language: string = $state($locale ?? "es");
    let toast = $state(false);
    let motivatingProjects: Category[] = $state([]);

    const CATEGORIES_COOKIE = "preferred-categories";

    $effect(() => {
        const stored = getCookie(CATEGORIES_COOKIE);
        if (!stored || motivatingProjects.length > 0 || categories.length === 0) {
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

    /* The preferred language is the only preference this screen owns, and the API has no
       endpoint for it: it lives in a cookie, read back by `src/middleware/index.ts`. */
    async function save() {
        setCookie("preferred-lang", language);

        const ids = motivatingProjects
            .map((category) => category.id)
            .filter((id): id is string => id !== undefined && id !== null)
            .map((id) => String(id));

        setCookie(CATEGORIES_COOKIE, JSON.stringify(ids));

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
                    labelText={$t("pages.me.manage.preferences.languages.preferred")}
                    bind:value={language}
                >
                    {#each Object.entries(languagesList) as [code, name] (code)}
                        <option value={code}>{name}</option>
                    {/each}
                </Select>
            </div>
        </div>
    </section>
    <MotivatingProjectsSection options={categories} bind:selected={motivatingProjects} />
</form>

<Toast bind:showToast={toast} variant="success">
    {$t("pages.me.manage.preferences.toast.saved")}
</Toast>
