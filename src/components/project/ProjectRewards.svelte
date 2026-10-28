<script lang="ts">
    import Reward from "./Reward.svelte";
    import { t } from "../../i18n/store";
    import { apiProjectRewardsGetCollection } from "../../openapi/client/index";
    import { cart, checkoutReady } from "../../stores/checkoutsStore";
    import { DEFAULT_CURRENCY } from "../../utils/currencies";
    import Spinner from "../icons/status/Spinner.svelte";
    import Button from "../library/buttons/Button.svelte";
    import Loader from "../library/feedback/Loader.svelte";
    import CurrencyInput from "../library/inputs/CurrencyInput.svelte";
    import Grid from "../library/layout/Grid.svelte";
    import Title from "../library/typography/Title.svelte";

    import type {
        Accounting,
        MoneyInput,
        ProjectReward,
        Project,
    } from "../../openapi/client/index";

    let {
        lang = $bindable(),
        project,
        accounting,
    }: {
        lang: string;
        project: Project;
        accounting: Accounting;
    } = $props();

    let projectId = $derived(project.id!.toString());

    let rewards: ProjectReward[] = $state([]);
    let isLoading = $state(true);
    let isDonating = $state(false);
    // svelte-ignore state_referenced_locally
    let money = $state<MoneyInput>({
        amount: 0,
        currency: accounting.currency ?? DEFAULT_CURRENCY,
    });
    let amountError = $state("");

    $effect(() => {
        apiProjectRewardsGetCollection({
            query: { project: projectId, "order[money.amount]": "asc" },
            headers: { "Accept-Language": lang },
        })
            .then((data) => {
                rewards = data.data ?? [];
            })
            .finally(() => {
                isLoading = false;
            });
    });

    let isAvailable = $state(calcAvailability());
    function calcAvailability(reward?: ProjectReward): boolean {
        if (project.status !== "in_campaign") {
            return false;
        }

        if (reward && reward.isFinite && reward.unitsAvailable === 0) {
            return false;
        }

        return true;
    }

    async function handleFreeDonation() {
        if (money.amount <= 0) {
            amountError = $t("pages.project.view.rewards.error.amount");
            return;
        }

        amountError = "";
        isDonating = true;

        cart.addItem({
            kind: "free",
            type: "single",
            quantity: 1,
            title: $t("common.donate"),
            recipient: accounting.owner ?? project.owner ?? project.accounting!,
            recipientDisplayName: project.title,
            target: project.accounting!,
            cover: project.cover,
            money,
        });

        await checkoutReady();
        window.location.href = "/checkout";
    }
</script>

<section>
    <div class="flex flex-col gap-12">
        <Title level={2} variant="headline" color="secondary">
            {$t("pages.project.view.rewards.title")}
        </Title>
        <Grid class="grid-cols-1 sm:grid-cols-2">
            <div
                class:opacity-50={!isAvailable}
                class:cursor-not-allowed={!isAvailable}
                class="border-grey bg-purple-soft flex basis-1/3 flex-col justify-between gap-6 rounded-4xl border p-6 shadow-[0px_1px_3px_0px_#0000001A]"
            >
                <div class="flex flex-col gap-3">
                    <Title
                        level={3}
                        variant="subsection"
                        color="secondary"
                        weight="bold"
                        class="w-full text-left"
                    >
                        {$t("pages.project.view.rewards.donationFree.title")}
                    </Title>
                    <p class="text-content text-base whitespace-pre-line">
                        {$t("pages.project.view.rewards.donationFree.description")}
                    </p>
                </div>
                <div class="mt-auto flex flex-col">
                    <CurrencyInput
                        amount={money.amount}
                        currency={money.currency}
                        placeholder={$t("pages.project.view.rewards.donationFree.placeholder")}
                        error={amountError}
                        onInput={(newMoney) => (money = newMoney)}
                    />
                    <Button
                        kind="secondary"
                        class="w-full"
                        disabled={!isAvailable || isDonating}
                        onclick={handleFreeDonation}
                    >
                        {#if isDonating}
                            <Spinner />
                        {:else}
                            {$t("common.donate")}
                        {/if}
                    </Button>
                </div>
            </div>
            {#if isLoading}
                <Loader />
            {:else}
                {#each rewards as reward}
                    <Reward {reward} {project} isAvailable={calcAvailability(reward)} />
                {/each}
            {/if}
        </Grid>
    </div>
</section>
