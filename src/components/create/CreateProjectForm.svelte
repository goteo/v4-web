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
    import { CAMPAIGN_MAX_END_DATE, CAMPAIGN_MIN_START_DATE } from "../../utils/dates";
    import { getValidationParams } from "../../utils/validation";
    import {
        zCreateProjectForm,
        zProjectCampaignRelease,
    } from "../../validation/projectValidation";
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
    import Title from "../library/typography/Title.svelte";

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
    let isValid = $derived(Object.values(validation).every((issues) => !issues?.length));
    let submitState = $state<ActionableState>("actionable");
    let showError = $state(false);

    function validate(field: keyof typeof form) {
        const result = zCreateProjectForm.shape[field].safeParse(form[field]);

        validation[field] = result.error?.issues;
    }

    function hasError(field: keyof typeof form) {
        return validation[field] && validation[field].length > 0;
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

    function handleCategories(categories: Category[]) {
        form.categories = toIris(categories, apiCategoriesIdOrSlugGetUrl);

        validate("categories");
    }

    function handleThemes(themes: Theme[]) {
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
            <TextInput
                bind:value={form.title}
                onInput={() => validate("title")}
                helperText={$t("pages.project.create.description.titlePrompt")}
                placeholder={$t("pages.project.create.description.titlePlaceholder")}
                error={getValidationMessage("title")}
                required
            />
            <div class="relative">
                <TextArea
                    bind:value={form.subtitle}
                    onInput={() => validate("subtitle")}
                    error={getValidationMessage("subtitle")}
                    helperText={$t("pages.project.create.description.subtitlePrompt")}
                    placeholder={$t("pages.project.create.description.subtitlePlaceholder")}
                />
            </div>
        </div>
        <div class="flex flex-col gap-4">
            <Title level={2} variant="subsection">
                {$t("pages.project.create.categories.title")}
            </Title>
            <p
                class={twJoin(
                    "transition-all duration-300 ease-in-out",
                    hasError("categories") ? "text-tertiary" : "text-black",
                )}
            >
                {#if hasError("categories")}
                    {getValidationMessage("categories")}
                {:else}
                    {$t("pages.project.create.categories.subtitle")}
                {/if}
            </p>
            <CategorySelect max={2} options={categories} onChange={handleCategories} />
        </div>
        <div class="flex flex-col gap-4">
            <Title level={2} variant="subsection">
                {$t("pages.project.create.themes.title")}
            </Title>
            <p class="text-black transition-all duration-300 ease-in-out">
                {$t("pages.project.create.themes.subtitle")}
            </p>
            <CategorySelect max={1} options={themes} onChange={handleThemes} />
        </div>
        <div class="flex flex-col gap-4">
            <Title level={2} variant="subsection">
                {$t("pages.project.create.address.title")}
            </Title>
            <p class="text-black transition-all duration-300 ease-in-out">
                {$t("pages.project.create.address.subtitle")}
            </p>
            <TerritoryInput
                placeholder={$t("pages.project.create.address.placeholder")}
                onInput={handleTerritory}
                error={getValidationMessage("territory")}
            />
        </div>
        <div class="flex flex-col gap-4">
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
        <ActionableButton
            type="submit"
            action={submit}
            bind:state={submitState}
            disabled={!isValid || submitState !== "actionable"}
            class="w-fit"
        >
            {$t("pages.project.create.submit")}
        </ActionableButton>
    </form>
    <Toast floating variant="error" bind:showToast={showError}>
        {$t("system.error.unknown")}
    </Toast>
    <div class="ml-auto">
        <BaseCard
            class="border-grey flex h-full max-h-126.5 w-full max-w-109.25 flex-col bg-white"
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
            <p
                class="text-content w-full overflow-hidden text-base font-normal text-ellipsis whitespace-nowrap"
            >
                {form.subtitle || $t("pages.project.create.description.subtitlePlaceholder")}
            </p>
        </BaseCard>
    </div>
</section>
