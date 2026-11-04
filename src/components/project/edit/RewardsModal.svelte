<script lang="ts">
    import { Modal } from "flowbite-svelte";
    import { untrack } from "svelte";

    import RewardItemsSelector from "./RewardItemsSelector.svelte";
    import { t } from "../../../i18n/store";
    import { withoutCache } from "../../../openapi/cacheInterceptor";
    import {
        apiProjectRewardsIdDelete,
        apiProjectRewardsIdGet,
        apiProjectRewardsIdPatch,
        apiProjectRewardsPost,
    } from "../../../openapi/client";
    import { client } from "../../../openapi/client/client.gen";
    import { apiProjectsIdOrSlugGetUrl } from "../../../openapi/client/operation-paths.gen";
    import { zApiProjectRewardsPostBody } from "../../../openapi/client/zod.gen";
    import { DEFAULT_CURRENCY } from "../../../utils/currencies";
    import { primaryLanguage } from "../../../utils/lang";
    import { zCreateRewardForm, zUpdateRewardForm } from "../../../validation/rewardValidation";
    import TranslationLanguages from "../../admin/TranslationLanguages.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import DeleteModal from "../../library/feedback/DeleteModal.svelte";
    import Checkbox from "../../library/inputs/Checkbox.svelte";
    import CurrencyInput from "../../library/inputs/CurrencyInput.svelte";
    import FileUpload from "../../library/inputs/FileUpload.svelte";
    import RichTextEditor from "../../library/inputs/RichTextEditor.svelte";
    import TextInput from "../../library/inputs/TextInput.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { MoneyInput, ProjectReward } from "../../../openapi/client";
    import type { ProjectDraftStore } from "../../../stores/drafts/draftsStore";

    let {
        open = $bindable(false),
        draft,
        reward,
        onSave,
        onDelete,
    }: {
        open: boolean;
        draft: ProjectDraftStore;
        reward?: ProjectReward;
        onSave?: (reward: ProjectReward) => void;
        onDelete?: (reward: ProjectReward) => void;
    } = $props();

    /**
     * Reward being edited in the form. `unitsTotal` is normalized to a number so
     * it can be two-way bound to `RewardItemsSelector`.
     */
    type RewardForm = Omit<ProjectReward, "unitsTotal"> & { unitsTotal: number };

    /**
     * Builds the initial form values from the edited Reward, or sensible
     * defaults when creating a new one.
     */
    function initialData(): RewardForm {
        if (reward) {
            return { ...reward, unitsTotal: reward.unitsTotal ?? 0 };
        }

        return {
            project: client.buildUrl({
                url: apiProjectsIdOrSlugGetUrl,
                path: { idOrSlug: $draft.actual.id },
            }),
            title: "",
            description: "",
            cover: undefined,
            money: { amount: 0, currency: DEFAULT_CURRENCY },
            isFinite: false,
            hasShipping: false,
            unitsTotal: 0,
        };
    }

    /**
     * Editable form state. It must be `$state` (not `$derived`): derived values
     * are recomputed whenever their dependencies change, which would wipe the
     * user's input — e.g. toggling the "is infinite" checkbox changes
     * `isFinite`/`unitsTotal`.
     */
    let data = $state<RewardForm>(initialData());

    let validation: Partial<Record<keyof typeof data, string>> = $state({});

    /** The translatable fields of the Reward. `data` holds the ones shared by every language. */
    interface Texts {
        title: string;
        description: string;
    }

    const emptyTexts = (): Texts => ({ title: "", description: "" });

    let languages = $state($draft.languages);
    let selectedLanguage = $state($draft.lang);
    let texts = $state<Record<string, Texts>>({});

    let isLoading = $state(false);
    let isSaving = $state(false);
    let errorMessage = $state("");

    // Set once a new Reward exists, so retrying a failed translation doesn't create it twice.
    let createdId: number | undefined;

    const active = $derived(texts[selectedLanguage] ?? emptyTexts());

    const descriptionError = $derived(getValidationMessage("description"));

    function getValidationMessage(field: keyof typeof data): string {
        if (!validation[field]) {
            return "";
        }

        return $t(validation[field]);
    }

    /**
     * Starts the form over from the remote Reward, in the project's languages plus any other the
     * Reward already has. Reading only `reward.locales` skips the API's fallback content, which
     * would otherwise show up as a translation of the languages the Reward lacks.
     */
    async function resetForm() {
        const locales = reward?.locales ?? [];

        data = initialData();
        validation = {};
        errorMessage = "";
        createdId = undefined;
        languages = [...new Set([...$draft.languages, ...locales])];
        selectedLanguage = $draft.lang;
        texts = Object.fromEntries(languages.map((code) => [code, emptyTexts()]));

        if (!reward) return;

        isLoading = true;

        try {
            const loaded = await Promise.all(
                locales.map(async (code): Promise<[string, Texts]> => {
                    const { data: translated } = await withoutCache(() =>
                        apiProjectRewardsIdGet({
                            baseUrl: "/api/relay",
                            headers: { "Accept-Language": code },
                            path: { id: String(reward.id) },
                            throwOnError: true,
                        }),
                    );

                    return [
                        code,
                        { title: translated.title, description: translated.description ?? "" },
                    ];
                }),
            );

            texts = { ...texts, ...Object.fromEntries(loaded) };
            isLoading = false;
        } catch (error) {
            // Stays loading: saving would delete the translations that couldn't be read.
            console.error(error);
            errorMessage = $t("pages.project.edit.rewards.modal.loadError");
        }
    }

    $effect(() => {
        if (open) untrack(resetForm);
    });

    function handleTitle(newTitle: string) {
        const result = zApiProjectRewardsPostBody.shape.title.safeParse(newTitle);

        if (result.success) {
            validation["title"] = "";
            return;
        }
        validation["title"] = result.error.issues[0].message;
    }

    function handleDescription(newDescription: string) {
        active.description = newDescription;

        const result = zApiProjectRewardsPostBody.shape.description.safeParse(newDescription);

        if (result.success) {
            validation["description"] = "";
            return;
        }

        validation["description"] = result.error.issues[0].message;
    }

    function handleMoney(newMoney: MoneyInput) {
        const result = zApiProjectRewardsPostBody.shape.money.safeParse(newMoney, {
            error: (issue) => {
                if (issue.code === "too_small") {
                    return "pages.project.edit.rewards.validation.amount";
                }
            },
        });

        if (result.success) {
            data.money = newMoney;
            validation["money"] = "";
            return;
        }

        validation["money"] = result.error.issues[0].message;
    }

    async function handleSubmit(event: SubmitEvent) {
        event.preventDefault();

        validation = {};
        errorMessage = "";

        // The project's languages are preloaded, not mandatory: blank ones stay untranslated.
        const filled = languages.filter((code) =>
            Object.values(texts[code]).some((text) => text.trim()),
        );
        const base = primaryLanguage(filled.length > 0 ? filled : languages);
        const schema = reward ? zUpdateRewardForm : zCreateRewardForm;

        for (const code of new Set([...filled, base])) {
            const result = schema.safeParse({ ...data, ...texts[code] });

            if (result.success) continue;

            selectedLanguage = code;

            for (const issue of result.error.issues) {
                if (issue.code === "too_small" && issue.path[0] === "money") {
                    validation["money"] = "pages.project.edit.rewards.validation.amount";
                    continue;
                }

                validation[issue.path[0] as keyof typeof data] = issue.message;
            }

            return;
        }

        const body = { ...data, ...texts[base] };

        isSaving = true;

        try {
            await save(body, base, filled);

            open = false;
            onSave?.(body);
        } catch (error) {
            console.error(error);
            errorMessage = $t("pages.project.edit.rewards.modal.saveError");
        } finally {
            isSaving = false;
        }
    }

    /** One request per language: the API takes a single Content-Language per request. */
    async function save(body: RewardForm, base: string, filled: string[]) {
        let id = reward?.id ?? createdId;
        let pending = filled;

        if (id === undefined) {
            const { data: created } = await apiProjectRewardsPost({
                baseUrl: "/api/relay",
                headers: { "Content-Language": base },
                body,
                throwOnError: true,
            });

            id = createdId = created.id!;
            pending = filled.filter((code) => code !== base);
        }

        const path = { id: String(id) };

        for (const code of pending) {
            await apiProjectRewardsIdPatch({
                baseUrl: "/api/relay",
                headers: { "Content-Language": code },
                path,
                body: { ...body, ...texts[code] },
                throwOnError: true,
            });
        }

        // After saving: the API refuses to delete a Reward's last language.
        for (const code of reward?.locales?.filter((code) => !filled.includes(code)) ?? []) {
            await apiProjectRewardsIdDelete({
                baseUrl: "/api/relay",
                headers: { "Content-Language": code },
                path,
                throwOnError: true,
            });
        }
    }

    let openDeleteModal = $state(false);

    function handleDeleteClick() {
        if (reward) {
            onDelete?.(reward);
            openDeleteModal = false;
            open = false;
        }
    }
</script>

<Modal
    bind:open
    closeBtnClass="top-7 end-7 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex max-h-[90vh] w-full max-w-225 -translate-x-1/2 -translate-y-1/2 divide-y-0 bg-transparent backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    bodyClass="flex p-0"
>
    <div class="flex min-h-0 flex-col gap-8 overflow-y-auto rounded-3xl bg-white p-6 shadow-lg">
        <Title level={2} variant="subsection">
            {$t("pages.project.edit.rewards.modal.title")}
        </Title>
        <p class="text-content line-clamp-1 overflow-hidden text-base font-normal text-ellipsis">
            {$t("pages.project.edit.rewards.modal.description")}
        </p>
        <!-- Outside the form: Enter in its language search must not submit the Reward. -->
        <TranslationLanguages
            bind:languages
            bind:selected={selectedLanguage}
            onAdd={(code) => (texts[code] = emptyTexts())}
            onRemove={(code) => delete texts[code]}
            onSelect={() => (validation = {})}
        />
        <form class="flex flex-col gap-8" onsubmit={handleSubmit}>
            <div class="flex flex-col gap-4 pt-2 inert:opacity-50" inert={isLoading}>
                <TextInput
                    bind:value={() => active.title, (title) => (active.title = String(title))}
                    labelText={$t("pages.project.edit.rewards.modal.form.titleLabel")}
                    helperText={$t("pages.project.edit.rewards.modal.form.titleHelper")}
                    placeholder={$t("pages.project.edit.rewards.modal.form.titlePlaceholder")}
                    error={getValidationMessage("title")}
                    onInput={(title) => handleTitle(String(title))}
                />
                <div class="flex flex-col gap-1">
                    <RichTextEditor
                        id="description"
                        format="markdown"
                        value={active.description}
                        onChange={handleDescription}
                        placeholder={$t(
                            "pages.project.edit.rewards.modal.form.descriptionPlaceholder",
                        )}
                        labelText={$t("pages.project.edit.rewards.modal.form.descriptionLabel")}
                        error={descriptionError}
                        ariaDescribedBy="description-helper"
                    />
                    <p class="text-content ml-4 text-xs" id="description-helper">
                        {$t("pages.project.edit.rewards.modal.form.descriptionHelper")}
                    </p>
                </div>
                <CurrencyInput
                    amount={data.money.amount}
                    currency={data.money.currency}
                    labelText={$t("pages.project.edit.rewards.modal.form.moneyLabel")}
                    helperText={$t("pages.project.edit.rewards.modal.form.moneyHelper")}
                    onInput={handleMoney}
                    error={getValidationMessage("money")}
                />
                <div class="flex flex-col gap-6">
                    <FileUpload
                        onUpload={(file) => (data.cover = file.url)}
                        labelText={$t("pages.project.edit.rewards.modal.form.coverLabel")}
                        placeholder={$t("pages.project.edit.rewards.modal.form.coverPlaceholder")}
                        helperText={$t("pages.project.edit.rewards.modal.form.coverHelper")}
                        error={getValidationMessage("cover")}
                    />
                    <RewardItemsSelector
                        bind:units={data.unitsTotal}
                        bind:limited={data.isFinite}
                    />
                    <div class="flex flex-col gap-1">
                        <Checkbox
                            bind:checked={data.hasShipping}
                            label={$t("pages.project.edit.rewards.modal.form.shippingLabel")}
                        />
                        <p class="text-content text-sm">
                            {$t("pages.project.edit.rewards.modal.form.shippingHelper")}
                        </p>
                    </div>
                </div>
            </div>
            {#if errorMessage}
                <p class="text-semantic-error text-sm">{errorMessage}</p>
            {/if}
            <div class="flex items-center justify-end gap-4">
                {#if reward && onDelete}
                    <Button kind="secondary" onclick={() => (openDeleteModal = true)} class="w-fit">
                        {$t("common.remove")}
                    </Button>
                    <DeleteModal
                        title={$t("pages.project.edit.rewards.deleteModal.title")}
                        description={$t("pages.project.edit.rewards.deleteModal.description")}
                        bind:open={openDeleteModal}
                        onclick={() => handleDeleteClick()}
                    />
                {/if}
                <Button type="submit" class="w-fit" disabled={isLoading || isSaving}>
                    {$t("common.save")}
                </Button>
            </div>
        </form>
    </div>
</Modal>
