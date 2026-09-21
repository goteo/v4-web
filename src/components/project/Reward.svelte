<script lang="ts">
    import RewardModal from "./RewardModal.svelte";
    import { t } from "../../i18n/store";
    import { formatCurrency } from "../../utils/currencies";
    import UnitIcon from "../icons/UnitIcon.svelte";
    import UserIcon from "../icons/user/User.svelte";
    import Button from "../library/buttons/Button.svelte";
    import Reward from "../library/cards/Reward.svelte";

    import type { Project, ProjectReward } from "../../openapi/client";

    let {
        reward = $bindable(),
        project,
        isAvailable = $bindable(),
    }: {
        reward: ProjectReward;
        project: Project;
        isAvailable: boolean;
    } = $props();

    let openModal = $state(false);
</script>

<Reward {reward} disabled={!isAvailable}>
    {#snippet stats()}
        {#if reward.isFinite}
            <div class="text-secondary flex items-center justify-between gap-2 text-sm font-bold">
                <UnitIcon />
                <span>
                    {@html $t(
                        "domain.project.reward.unitsAvailable",
                        { units: `${reward.unitsAvailable}` },
                        { allowHTML: true },
                    )}
                </span>
            </div>
        {:else}
            <div class="text-secondary flex items-center justify-between gap-2 text-sm font-bold">
                <UserIcon />
                <span>
                    {@html $t(
                        "domain.project.reward.donators",
                        { donators: reward.unitsClaimed! },
                        { allowHTML: true },
                    )}
                </span>
            </div>
        {/if}
    {/snippet}

    <Button
        kind="secondary"
        class="w-full"
        disabled={!isAvailable}
        onclick={() => (openModal = true)}
    >
        {$t("common.donateAmount", {
            amount: formatCurrency(reward.money.amount, reward.money.currency),
        })}
    </Button>
    <RewardModal {reward} {project} bind:open={openModal} />
</Reward>
