<script lang="ts">
    import { Modal } from "flowbite-svelte";
    import { onMount } from "svelte";
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import { t } from "../../i18n/store";
    import { cart, checkoutReady } from "../../stores/checkoutsStore";
    import { getDefaultCurrency } from "../../utils/consts";
    import { formatCurrency, getUnit } from "../../utils/currencies";
    import { lt } from "../../utils/money";
    import { renderMarkdown } from "../../utils/renderMarkdown";
    import UnitIcon from "../icons/UnitIcon.svelte";
    import UserIcon from "../icons/user/User.svelte";
    import Button from "../library/buttons/Button.svelte";
    import TextInput from "../library/inputs/TextInput.svelte";

    import type { Project, ProjectReward } from "../../openapi/client";

    let {
        open = $bindable(false),
        reward = $bindable(),
        project,
    }: {
        open: boolean;
        reward: ProjectReward;
        project: Project;
    } = $props();

    let rawInput = $state("");
    let customAmount = $state(0);
    let link = $state(`/calculadora-fiscal`);

    async function updateAmount(action: "close" | "checkout") {
        const numericAmount = customAmount;

        if (
            isNaN(numericAmount) ||
            lt(
                {
                    amount: numericAmount * getUnit(reward.money?.currency),
                    currency: reward.money.currency,
                },
                reward.money ?? { amount: 0, currency: getDefaultCurrency() },
            )
        ) {
            alert($t("pages.project.view.rewards.error.invalidAmount"));
            return;
        }

        cart.addItem({
            kind: "reward",
            type: "single",
            reward: reward,
            title: reward.title,
            quantity: 1,
            recipient: reward.project,
            recipientDisplayName: project.title,
            target: project.accounting!,
            cover: reward.cover ?? project.cover,
            money: {
                amount: numericAmount * getUnit(reward.money?.currency),
                currency: reward.money.currency,
            },
        });

        if (action === "checkout") {
            await checkoutReady();
            window.location.href = "/checkout";
        } else {
            open = false;
        }
    }

    onMount(() => {
        rawInput = formatCurrency(reward.money);
        customAmount = +formatCurrency(reward.money, {
            asLocaleString: false,
        });
    });
</script>

{#snippet cover(className: ClassNameValue)}
    <img src={reward.cover} alt={reward.title} class={twMerge(className)} />
{/snippet}

{#snippet titles()}
    <div class="text-secondary w-full text-left">
        <h3 class="text-[2.5rem] leading-12 font-bold">
            {@html $t(
                "domain.project.reward.byAtLeastOrMore",
                {
                    amount: formatCurrency(reward.money),
                },
                { allowHTML: true },
            )}
        </h3>
        <h3 class="text-double max-h-30 overflow-hidden leading-10 font-medium">
            {reward.title}
        </h3>
    </div>
{/snippet}

{#snippet description()}
    <div class="marked-content flex min-w-0 flex-1 flex-col">
        {#await renderMarkdown(reward.description!) then content}
            {@html content}
        {/await}
    </div>
{/snippet}

{#snippet donationInput()}
    <div class="flex flex-col gap-6">
        <p class="text-secondary text-sm font-medium">
            {$t("pages.project.view.rewards.donationFree.additionalDonation")}
        </p>
        <!-- TO-DO: Change this input to dedicated CurrencyInput -->
        <TextInput
            labelText={$t("domain.project.reward.donation")}
            type="text"
            class="focus-ring-2 focus:ring-tertiary w-full rounded border border-gray-300 p-4"
            bind:value={rawInput}
            onFocus={() => {
                rawInput = customAmount.toString();
            }}
            onBlur={() => {
                const currency = reward?.money?.currency!;
                const unit = getUnit(currency);

                const parsed = parseFloat(rawInput.replace(/[^\d.,]/g, "").replace(",", "."));
                customAmount = isNaN(parsed) ? 0 : parsed;

                rawInput = customAmount > 0 ? formatCurrency(customAmount * unit, currency) : "";
            }}
            placeholder={$t("pages.project.view.rewards.donationFree.placeholder")}
        />
    </div>
{/snippet}

{#snippet stats()}
    <div
        class="text-secondary flex flex-row flex-wrap items-center gap-4 lg:flex-col lg:items-stretch lg:gap-2"
    >
        <div class="flex items-center gap-2 text-sm font-bold">
            <UserIcon />
            <span>
                {@html $t(
                    "domain.project.reward.donators",
                    { donators: reward.unitsClaimed! },
                    { allowHTML: true },
                )}
            </span>
        </div>
        {#if reward.isFinite}
            <div class="flex items-center gap-2 text-sm font-bold">
                <UnitIcon />
                <span>
                    {@html $t(
                        "domain.project.reward.unitsAvailable",
                        { units: reward.unitsAvailable! },
                        { allowHTML: true },
                    )}
                </span>
            </div>
        {/if}
    </div>
{/snippet}

<Modal
    bind:open
    closeBtnClass="cursor-pointer top-7 end-12 bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 w-full max-w-225 -translate-x-1/2 -translate-y-1/2 divide-y-0 bg-transparent backdrop:backdrop-blur-[5px]"
    bodyClass="p-0"
>
    <div
        class="flex max-h-[85vh] flex-col gap-6 rounded-3xl bg-white p-6 shadow-lg"
        onclick={(e) => e.stopPropagation()}
        role="presentation"
    >
        <div class="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden md:hidden">
            {@render cover("h-64 w-full rounded-2xl object-cover")}
            {@render titles()}
            <div class="min-h-0 flex-1 overflow-y-auto pr-2 text-gray-700">
                {@render description()}
            </div>
            {@render donationInput()}
            {@render stats()}
        </div>
        <div class="hidden min-h-0 flex-1 flex-col gap-6 overflow-hidden md:flex">
            {@render titles()}
            <div class="flex min-h-0 flex-1 gap-10">
                <aside class="shrink-0 space-y-4">
                    {@render cover("aspect-square size-60 rounded-3xl object-cover")}
                    {@render stats()}
                </aside>
                <div class="min-h-0 flex-1 space-y-8 overflow-y-auto pr-2 pb-2 text-gray-700">
                    {@render description()}
                    {@render donationInput()}
                </div>
            </div>
        </div>
        <div class="flex flex-col gap-4 lg:flex-row">
            <Button kind="ghost" onclick={() => updateAmount("close")} class="w-full">
                {$t("pages.project.view.rewards.addToCart")}
            </Button>
            <Button onclick={() => updateAmount("checkout")} class="w-full">
                {$t("common.donate")}
            </Button>
        </div>
    </div>
</Modal>
