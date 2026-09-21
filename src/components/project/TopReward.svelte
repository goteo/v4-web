<script lang="ts">
    import RewardModal from "./RewardModal.svelte";
    import { t } from "../../i18n/store";
    import { formatCurrency } from "../../utils/currencies";
    import Button from "../library/buttons/Button.svelte";
    import Reward from "../library/cards/Reward.svelte";

    import type { Project, ProjectReward } from "../../openapi/client";

    let {
        reward = $bindable(),
        project,
    }: {
        reward: ProjectReward;
        project: Project;
    } = $props();

    let openModal = $state(false);

    let isAvailable = calcAvailability();
    function calcAvailability(): boolean {
        if (project.status !== "in_campaign") {
            return false;
        }

        if (reward.isFinite && reward.unitsAvailable! === 0) {
            return false;
        }

        return true;
    }
</script>

<Reward variant="compact" {reward} disabled={!isAvailable}>
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
