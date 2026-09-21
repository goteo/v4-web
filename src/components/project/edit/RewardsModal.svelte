<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import RewardItemsSelector from "./RewardItemsSelector.svelte";
    import { t } from "../../../i18n/store";
    import { client } from "../../../openapi/client/client.gen";
    import { apiProjectsIdOrSlugGetUrl } from "../../../openapi/client/operation-paths.gen";
    import { zApiProjectRewardsPostBody } from "../../../openapi/client/zod.gen";
    import { DEFAULT_CURRENCY } from "../../../utils/currencies";
    import { zCreateRewardForm, zUpdateRewardForm } from "../../../validation/rewardValidation";
    import Button from "../../library/buttons/Button.svelte";
    import DeleteModal from "../../library/feedback/DeleteModal.svelte";
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

    let isFinite = $derived(reward?.isFinite || false);
    let unitsTotal = $derived(reward?.unitsTotal || 0);

    let data: ProjectReward = $derived.by(() => {
        if (reward) {
            return { ...reward, isFinite, unitsTotal };
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
            isFinite,
            unitsTotal,
        };
    });

    let validation: Partial<Record<keyof typeof data, string>> = $state({});

    const descriptionError = $derived(getValidationMessage("description"));

    function getValidationMessage(field: keyof typeof data): string {
        if (!validation[field]) {
            return "";
        }

        return $t(validation[field]);
    }

    function handleTitle(newTitle: string) {
        const result = zApiProjectRewardsPostBody.shape.title.safeParse(newTitle);

        if (result.success) {
            validation["title"] = "";
            return;
        }
        validation["title"] = result.error.issues[0].message;
    }

    function handleDescription(newDescription: string) {
        data.description = newDescription;

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

    function handleSubmit(event: SubmitEvent) {
        event.preventDefault();

        const rewardValidation = reward ? zUpdateRewardForm : zCreateRewardForm;
        const result = rewardValidation.safeParse(data);

        if (result.success) {
            onSave?.(data);
            return;
        }

        for (const issue of result.error.issues) {
            if (issue.code === "too_small" && issue.path[0] === "money") {
                validation["money"] = "pages.project.edit.rewards.validation.amount";
                continue;
            }

            validation[issue.path[0] as keyof typeof data] = issue.message;
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
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex w-full max-w-225 -translate-x-1/2 -translate-y-1/2 divide-y-0 bg-transparent backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    bodyClass="p-0"
>
    <form class="flex flex-col gap-8 rounded-3xl bg-white p-6 shadow-lg" onsubmit={handleSubmit}>
        <Title level={2} variant="subsection">
            {$t("pages.project.edit.rewards.modal.title")}
        </Title>
        <p class="text-content line-clamp-1 overflow-hidden text-base font-normal text-ellipsis">
            {$t("pages.project.edit.rewards.modal.description")}
        </p>
        <div class="flex flex-col gap-4 pt-2">
            <TextInput
                bind:value={data.title}
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
                    value={data.description!}
                    onChange={handleDescription}
                    placeholder={$t("pages.project.edit.rewards.modal.form.descriptionPlaceholder")}
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
                <RewardItemsSelector bind:units={unitsTotal} bind:limited={isFinite} />
            </div>
        </div>
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
            <Button type="submit" class="w-fit">
                {$t("common.save")}
            </Button>
        </div>
    </form>
</Modal>
