<script lang="ts">
    import VerifiedBadge from "./VerifiedBadge.svelte";
    import { t } from "../../i18n/store";
    import { getDefaultCurrency } from "../../utils/consts";
    import { formatCurrency } from "../../utils/currencies";

    interface Props {
        projectsDonated?: number;
        moneyDonatedAmount?: number; // Amount in minor units (cents)
        moneyDonatedCurrency?: string; // ISO 4217 currency code
    }

    let {
        projectsDonated = 0,
        moneyDonatedAmount = 0,
        moneyDonatedCurrency = getDefaultCurrency(),
    }: Props = $props();

    // Format currency using the project's formatCurrency function
    const formattedMoney = $derived(formatCurrency(moneyDonatedAmount, moneyDonatedCurrency));
</script>

<div class="mx-auto mt-10 flex w-full gap-6 px-10">
    <!-- Fan Card -->
    <div
        class="bg-grey border-grey flex max-h-64 grow flex-col gap-6 rounded-3xl border p-6 shadow-sm"
    >
        <div class="flex flex-col gap-10">
            <div class="flex items-center justify-between">
                <div class="text-secondary flex flex-col gap-2">
                    <p class="text-4xl leading-tight font-bold">
                        {$t("pages.profile.donorType.fan.title")}
                    </p>
                    <p class="text-base leading-normal">
                        {$t("pages.profile.donorType.fan.description", { amount: formattedMoney })}
                    </p>
                </div>
                <div class="size-25">
                    <VerifiedBadge class="size-full" />
                </div>
            </div>
            <div class="flex gap-10">
                <div class="text-secondary flex flex-col">
                    <p class="text-base leading-normal">
                        {$t("pages.profile.donorType.fan.projectsDonated")}
                    </p>
                    <p class="text-3xl leading-tight font-bold">
                        {projectsDonated.toString().padStart(2, "0")}
                    </p>
                </div>
                <div class="text-secondary flex flex-col">
                    <p class="text-base leading-normal">
                        {$t("pages.profile.donorType.fan.moneyDonated")}
                    </p>
                    <p class="text-3xl leading-tight font-bold">
                        {formattedMoney}
                    </p>
                </div>
            </div>
        </div>
    </div>

    <!-- Next Level Card -->
    <div class="border-grey flex max-h-64 grow flex-col gap-6 rounded-3xl border bg-white p-6">
        <div class="flex flex-col gap-2">
            <p class="text-secondary text-4xl leading-tight font-bold">
                {$t("pages.profile.donorType.nextLevel.title")}
            </p>
            <p class="text-tertiary text-base leading-normal">
                {$t("pages.profile.donorType.nextLevel.description")}
            </p>
        </div>
        <div class="flex w-full items-center justify-between gap-2">
            <!-- Current Badge -->
            <VerifiedBadge class="size-24" />

            <!-- Progress Bar -->
            <div
                class="border-grey flex h-4 w-full grow rounded-lg border bg-white p-0.5 shadow-lg"
            >
                <div
                    class="from-grey to-semantic-notification h-3 w-21.5 rounded-lg bg-linear-to-r shadow-[8px_8px_20px_0px_inset_rgba(255,255,255,0.2)]"
                ></div>
            </div>

            <!-- Next Badge -->
            <VerifiedBadge class="size-24" />
        </div>
    </div>
</div>
