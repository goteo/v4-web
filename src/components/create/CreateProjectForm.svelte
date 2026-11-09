<script lang="ts">
    import { twJoin } from "tailwind-merge";

    import { locale, t } from "../../i18n/store";
    import {
        type Category,
        type ApiProjectsPostData,
        type Territory,
        type Theme,
        apiCategoriesIdOrSlugGetUrl,
        apiProjectsPost,
        apiThemesIdOrSlugGetUrl,
    } from "../../openapi/client";
    import { client } from "../../openapi/client/client.gen";
    import { CAMPAIGN_MAX_END_DATE, CAMPAIGN_MIN_START_DATE, formatDate } from "../../utils/dates";
    import { useFormDraft, restoreFields } from "../../utils/forms/useFormDraft.svelte";
    import { getValidationParams } from "../../utils/validation";
    import {
        zCreateProjectForm,
        zProjectCampaignRelease,
    } from "../../validation/projectValidation";
    import BookmarkIcon from "../icons/actions/Bookmark.svelte";
    import CalendarIcon from "../icons/Calendar.svelte";
    import CategoryIcon from "../icons/Category.svelte";
    import LocationIcon from "../icons/Location.svelte";
    import ActionableButton, {
        type ActionableState,
    } from "../library/buttons/ActionableButton.svelte";
    import BaseCard from "../library/cards/BaseCard.svelte";
    import Toast from "../library/feedback/Toast.svelte";
    import CategorySelect from "../library/inputs/CategorySelect.svelte";
    import DateInput from "../library/inputs/DateInput.svelte";
    import TerritoryInput from "../library/inputs/TerritoryInput.svelte";
    import TextArea from "../library/inputs/TextArea.svelte";
    import TextInput from "../library/inputs/TextInput.svelte";
    import Tag from "../library/tags/Tag.svelte";
    import Title from "../library/typography/Title.svelte";
    import TerritoryTag from "../project/TerritoryTag.svelte";

    import type z from "zod";

    let { categories, themes }: { categories: Category[]; themes: Theme[] } = $props();

    let form: Partial<ApiProjectsPostData["body"]> = $state({
        title: "",
        subtitle: "",
        categories: [],
        calendar: {
            release: CAMPAIGN_MIN_START_DATE.toISOString(),
        },
    });

    let validation: Partial<Record<keyof typeof form, z.core.$ZodIssue[]>> = $state({});
    let submitState = $state<ActionableState>("actionable");
    let showError = $state(false);
    let selectedCategories = $state<Category[]>([]);
    let selectedThemes = $state<Theme[]>([]);

    let titleSection: HTMLElement | undefined = $state();
    let subtitleSection: HTMLElement | undefined = $state();
    let categoriesSection: HTMLElement | undefined = $state();
    let themesSection: HTMLElement | undefined = $state();
    let territorySection: HTMLElement | undefined = $state();
    let releaseSection: HTMLElement | undefined = $state();

    /**
     * Identifiers of the picked categories and themes.
     *
     * The tags themselves are rendered from them, so they are what has to be kept to bring
     * the selection back after a language switch.
     */
    let selectedCategoryIds = $state<string[]>([]);
    let selectedThemeIds = $state<string[]>([]);
    /** Text of the territory search, which is what shows the picked place. */
    let territoryQuery = $state("");

    /**
     * Nothing sensitive goes into this form, so everything it holds can be kept.
     */
    const { restored } = useFormDraft("create-project", () => ({
        title: form.title ?? "",
        subtitle: form.subtitle ?? "",
        categoryIds: selectedCategoryIds,
        themeIds: selectedThemeIds,
        territory: form.territory,
        territoryQuery,
        release: form.calendar?.release,
    }));

    if (restored) {
        restoreFields(form, restored, ["title", "subtitle", "territory"]);

        const categoryIds = restored.categoryIds ?? [];
        const themeIds = restored.themeIds ?? [];

        selectedCategoryIds = categoryIds;
        selectedThemeIds = themeIds;

        form.categories = categoriesIri(categoryIds);
        form.themes = themesIri(themeIds);

        territoryQuery = restored.territoryQuery ?? "";

        if (restored.release) {
            form.calendar = { release: restored.release };
        }
    }

    function validate(field: keyof typeof form) {
        const result = zCreateProjectForm.shape[field].safeParse(form[field]);

        validation[field] = result.error?.issues;
    }

    function hasError(field: keyof typeof form) {
        return (validation[field]?.length ?? 0) > 0;
    }

    /**
     * Form fields in the order they are displayed, so the first invalid one is
     * also the topmost one.
     */
    const fieldSections: {
        field: keyof typeof form;
        getSection: () => HTMLElement | undefined;
    }[] = [
        { field: "title", getSection: () => titleSection },
        { field: "subtitle", getSection: () => subtitleSection },
        { field: "categories", getSection: () => categoriesSection },
        { field: "themes", getSection: () => themesSection },
        { field: "territory", getSection: () => territorySection },
        { field: "calendar", getSection: () => releaseSection },
    ];

    /**
     * Scrolls to the topmost invalid field and focuses it, so the user knows
     * which field has to be fixed.
     */
    function focusFirstInvalidField() {
        const section = fieldSections.find(({ field }) => hasError(field))?.getSection();

        if (!section) {
            return;
        }

        section.scrollIntoView({ behavior: "smooth", block: "center" });

        const focusable = section.querySelector<HTMLElement>(
            "input, textarea, select, button:not([disabled])",
        );

        focusable?.focus({ preventScroll: true });
    }

    function getValidationMessage(field: keyof typeof form) {
        const issue = validation[field]?.[0];

        if (!issue) {
            return "";
        }

        if (issue.code === "custom") {
            return $t(issue.message, issue.params);
        }

        if (issue.code === "invalid_format" && field === "title") {
            return $t("pages.project.create.validation.titleBadFormat");
        }

        if (issue.code === "too_small" && field === "title") {
            return $t("pages.project.create.validation.titleTooShort", {
                min: String(issue.minimum),
            });
        }

        if (issue.code === "too_small" && field === "subtitle") {
            return $t("pages.project.create.validation.subtitleMissing");
        }

        if (issue.code === "too_small" && field === "categories") {
            return $t("pages.project.create.validation.categoriesNotEnough", {
                min: String(issue.minimum),
            });
        }

        if (issue.code === "invalid_type" && field === "territory") {
            return $t("pages.project.create.validation.territoryMissing");
        }

        if (issue.code === "invalid_type" && field === "calendar") {
            return $t("pages.project.create.validation.releaseMissing");
        }

        return $t(`system.validation.${issue.code}`, {
            value: String(form[field]),
            ...getValidationParams(issue),
        });
    }

    function toIris(items: { id?: string }[], url: string) {
        return items.map(({ id }) => client.buildUrl({ url, path: { idOrSlug: String(id) } }));
    }

    /** IRIs of the categories with those identifiers. */
    function categoriesIri(ids: string[]): string[] {
        return toIris(
            categories.filter((category) => category.id && ids.includes(category.id)),
            apiCategoriesIdOrSlugGetUrl,
        );
    }

    /** IRIs of the themes with those identifiers. */
    function themesIri(ids: string[]): string[] {
        return toIris(
            themes.filter((theme) => theme.id && ids.includes(theme.id)),
            apiThemesIdOrSlugGetUrl,
        );
    }

    function handleCategories(categories: Category[]) {
        selectedCategories = categories;
        form.categories = toIris(categories, apiCategoriesIdOrSlugGetUrl);

        validate("categories");
    }

    function handleThemes(themes: Theme[]) {
        selectedThemes = themes;
        form.themes = toIris(themes, apiThemesIdOrSlugGetUrl);
    }

    function handleTerritory(territory: Territory) {
        form.territory = territory;

        validate("territory");
    }

    function handleRelease(release: Date) {
        form.calendar = { ...form.calendar, release: release.toISOString() };

        const result = zProjectCampaignRelease.safeParse(new Date(release));

        validation["calendar"] = result.error?.issues ?? [];
    }

    /**
     * Places API constraint violations under their fields, anything unrecognized goes to a toast.
     */
    function handleViolations(violations: { propertyPath?: string; message?: string }[]) {
        let unhandled = violations.length === 0;

        for (const { propertyPath, message = "" } of violations) {
            if (propertyPath === "title" && /already in use/i.test(message)) {
                validation.title = [
                    {
                        code: "custom",
                        path: ["title"],
                        message: "pages.project.create.validation.titleInUse",
                        input: form.title,
                    },
                ];
            } else {
                unhandled = true;
            }
        }

        showError = unhandled;
    }

    async function submit() {
        validation = {};
        showError = false;

        const result = zCreateProjectForm.safeParse(form);

        if (!result.success) {
            for (const issue of result.error.issues) {
                const field = issue.path[0] as keyof typeof form;

                validation[field] = [...(validation[field] ?? []), issue];
            }
        }

        // The API allows a null release date, but a campaign cannot be created without it
        if (!form.calendar?.release && !hasError("calendar")) {
            validation.calendar = [
                {
                    code: "custom",
                    path: ["calendar"],
                    message: "pages.project.create.validation.releaseMissing",
                    input: form.calendar,
                },
            ];
        }

        if (Object.values(validation).some((issues) => issues?.length)) {
            focusFirstInvalidField();

            throw new Error("Invalid project form");
        }

        const { data: project, error } = await apiProjectsPost({
            baseUrl: "/api/relay",
            headers: { "Content-Language": $locale },
            // @ts-expect-error form is declared as Partial, but at this point has been validated
            body: form,
        });

        if (error) {
            if ("violations" in error) {
                handleViolations(error.violations ?? []);

                if (hasError("title")) {
                    focusFirstInvalidField();
                }
            } else {
                showError = true;
            }

            // Lets the button go back to actionable so the user can retry
            throw new Error("Project creation failed", { cause: error });
        }

        window.location.href = `/project/${project.id}/edit`;
    }
</script>

<section class="wrapper md:flex md:flex-row">
    <form class="mb-20 flex max-w-167 flex-col gap-10" onsubmit={(event) => event.preventDefault()}>
        <div class="flex flex-col gap-4">
            <Title level={1} variant="section">
                {$t("pages.project.create.title")}
            </Title>
            <p class="text-black transition-all duration-300 ease-in-out">
                {$t("pages.project.create.subtitle")}
            </p>
        </div>

        <div class="flex flex-col gap-4">
            <Title level={2} variant="subsection">
                {$t("pages.project.create.description.title")}
            </Title>
            <p class="text-black transition-all duration-300 ease-in-out">
                {$t("pages.project.create.description.description")}
            </p>
            <div bind:this={titleSection}>
                <TextInput
                    bind:value={form.title}
                    onInput={() => validate("title")}
                    helperText={$t("pages.project.create.description.titlePrompt")}
                    placeholder={$t("pages.project.create.description.titlePlaceholder")}
                    error={getValidationMessage("title")}
                    required
                />
            </div>
            <div class="relative" bind:this={subtitleSection}>
                <TextArea
                    bind:value={form.subtitle}
                    onInput={() => validate("subtitle")}
                    error={getValidationMessage("subtitle")}
                    helperText={$t("pages.project.create.description.subtitlePrompt")}
                    placeholder={$t("pages.project.create.description.subtitlePlaceholder")}
                />
            </div>
        </div>
        <div class="flex flex-col gap-4" bind:this={categoriesSection}>
            <Title level={2} variant="subsection">
                {$t("pages.project.create.categories.title")}
            </Title>
            <p class="text-black transition-all duration-300 ease-in-out">
                {$t("pages.project.create.categories.subtitle")}
            </p>
            <CategorySelect
                max={2}
                options={categories}
                bind:selectedIds={selectedCategoryIds}
                onChange={handleCategories}
                error={getValidationMessage("categories")}
            />
        </div>
        <div class="flex flex-col gap-4" bind:this={themesSection}>
            <Title level={2} variant="subsection">
                {$t("pages.project.create.themes.title")}
            </Title>
            <p class="text-black transition-all duration-300 ease-in-out">
                {$t("pages.project.create.themes.subtitle")}
            </p>
            <CategorySelect
                max={1}
                options={themes}
                bind:selectedIds={selectedThemeIds}
                onChange={handleThemes}
            />
        </div>
        <div class="flex flex-col gap-4" bind:this={territorySection}>
            <Title level={2} variant="subsection">
                {$t("pages.project.create.address.title")}
            </Title>
            <p class="text-black transition-all duration-300 ease-in-out">
                {$t("pages.project.create.address.subtitle")}
            </p>
            <TerritoryInput
                placeholder={$t("pages.project.create.address.placeholder")}
                bind:value={territoryQuery}
                onInput={handleTerritory}
                error={getValidationMessage("territory")}
            />
        </div>
        <div class="flex flex-col gap-4" bind:this={releaseSection}>
            <Title level={2} variant="subsection">
                {$t("pages.project.create.release.title")}
            </Title>
            <p class="text-black transition-all duration-300 ease-in-out">
                {$t("pages.project.create.release.subtitle")}
            </p>
            <DateInput
                min={CAMPAIGN_MIN_START_DATE}
                max={CAMPAIGN_MAX_END_DATE}
                value={new Date(form.calendar?.release!)}
                helperText={$t("pages.project.create.release.label")}
                required
                onInput={handleRelease}
                error={getValidationMessage("calendar")}
            />
        </div>
        <ActionableButton type="submit" action={submit} bind:state={submitState} class="w-fit">
            {$t("pages.project.create.submit")}
        </ActionableButton>
    </form>
    <Toast floating variant="error" bind:showToast={showError}>
        {$t("system.error.unknown")}
    </Toast>
    <div class="mb-20 ml-auto">
        <BaseCard
            class="border-grey flex w-full max-w-109.25 flex-col bg-white md:sticky md:top-(--sticky-top)"
            style="box-shadow: 0 35px 10px 0 rgba(0, 0, 0, 0.00), 0 22px 9px 0 rgba(0, 0, 0, 0.01), 0 13px 8px 0 rgba(0, 0, 0, 0.05), 0 6px 6px 0 rgba(0, 0, 0, 0.09), 0 1px 3px 0 rgba(0, 0, 0, 0.10);"
        >
            <Title
                level={2}
                variant="section"
                color="secondary"
                class={twJoin("mb-2", !form.title && "opacity-24")}
            >
                {form.title || $t("pages.project.create.description.titlePlaceholder")}
            </Title>
            <p class="text-content line-clamp-4 w-full text-base font-normal break-words">
                {form.subtitle || $t("pages.project.create.description.subtitlePlaceholder")}
            </p>
            <div class="flex flex-wrap gap-2 pt-4">
                {#if selectedCategories.length}
                    <Tag>
                        <CategoryIcon width="24" height="24" />
                        <span>{selectedCategories.map(({ name }) => name).join(", ")}</span>
                    </Tag>
                {/if}
                {#if selectedThemes.length}
                    <Tag>
                        <BookmarkIcon />
                        <span>{selectedThemes.map(({ name }) => name).join(", ")}</span>
                    </Tag>
                {/if}
                {#if form.territory?.country}
                    <TerritoryTag territory={form.territory} iconSize="24" class="border-0" />
                {:else}
                    <Tag class="opacity-24">
                        <LocationIcon width="24" height="24" />
                        <span>{$t("pages.project.create.address.placeholder")}</span>
                    </Tag>
                {/if}
                {#if form.calendar?.release}
                    <Tag>
                        <CalendarIcon width="24" height="24" />
                        <span>{formatDate(new Date(form.calendar.release), $locale)}</span>
                    </Tag>
                {/if}
            </div>
        </BaseCard>
    </div>
</section>
