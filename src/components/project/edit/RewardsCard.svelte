<script lang="ts">
    import RewardsModal from "./RewardsModal.svelte";
    import { t } from "../../../i18n/store";
    import {
        apiProjectRewardsIdDelete,
        apiProjectRewardsIdPatch,
        type ProjectReward,
    } from "../../../openapi/client";
    import InfinityIcon from "../../icons/Infinity.svelte";
    import Close from "../../icons/navigation/Close.svelte";
    import UnitIcon from "../../icons/UnitIcon.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import Reward from "../../library/cards/Reward.svelte";
    import DeleteModal from "../../library/feedback/DeleteModal.svelte";

    import type { ProjectDraftStore } from "../../../stores/drafts/draftsStore";

    let {
        draft,
        reward,
        onSave,
        onDelete,
    }: {
        draft: ProjectDraftStore;
        reward: ProjectReward;
        onSave?: (reward: ProjectReward) => void;
        onDelete?: (reward: ProjectReward) => void;
    } = $props();

    let openModal = $state(false);
    let openDeleteModal = $state(false);

    async function handleSave(newReward: ProjectReward) {
        const { error } = await apiProjectRewardsIdPatch({
            baseUrl: "/api/relay",
            headers: { "Content-Language": $draft.lang },
            path: { id: String(reward.id) },
            body: newReward,
        });

        if (!error) {
            openModal = false;
            onSave?.(newReward);
            return;
        }

        console.error(error);
    }

    async function handleDelete(reward: ProjectReward) {
        const { error } = await apiProjectRewardsIdDelete({
            baseUrl: "/api/relay",
            path: { id: String(reward.id) },
        });

        if (!error) {
            openModal = false;
            onDelete?.(reward);
            return;
        }

        console.error(error);
    }
</script>

<Reward {reward} class="relative gap-2 md:gap-4">
    {#snippet stats()}
        {#if reward.isFinite}
            <div class="text-secondary flex items-center justify-between gap-1 text-base font-bold">
                <UnitIcon />
                <span>
                    {#if reward.unitsTotal === 1}
                        {$t("domain.project.reward.unitsTotal.single")}
                    {:else}
                        {@html $t("domain.project.reward.unitsTotal.multiple", {
                            units: String(reward.unitsTotal),
                        })}
                    {/if}
                </span>
            </div>
        {:else}
            <div class="text-secondary flex items-center justify-between font-bold">
                <UnitIcon />
                <InfinityIcon width="32" height="32" />
            </div>
        {/if}
    {/snippet}

    <button
        type="button"
        aria-label={$t("common.delete")}
        class="text-secondary absolute top-6 right-6 cursor-pointer transition-transform hover:scale-110"
        onclick={() => (openDeleteModal = true)}
    >
        <Close class="size-5" />
    </button>
    <Button kind="secondary" class="w-full" onclick={() => (openModal = true)}>
        {$t("common.edit")}
    </Button>

    <RewardsModal
        bind:open={openModal}
        {draft}
        {reward}
        onSave={handleSave}
        onDelete={handleDelete}
    />

    <DeleteModal
        title={$t("pages.project.edit.rewards.deleteModal.title")}
        description={$t("pages.project.edit.rewards.deleteModal.description")}
        bind:open={openDeleteModal}
        onclick={() => handleDelete(reward)}
    />
</Reward>
