<script lang="ts">
    import { t } from "../../../i18n/store";
    import MoreAndLess from "../../icons/filters/MoreAndLess.svelte";
    import InfinityIcon from "../../icons/Infinity.svelte";
    import Checkbox from "../../library/inputs/Checkbox.svelte";
    import Title from "../../library/typography/Title.svelte";

    let {
        limited = $bindable(false),
        units = $bindable(1),
        min = 1,
    }: {
        limited: boolean;
        units: number;
        min?: number;
    } = $props();

    let isInfinite: boolean = $derived(!limited);
    $effect(() => {
        limited = !isInfinite;
        units = isInfinite ? 0 : units;
    });

    function increment() {
        if (limited) units += 1;
    }

    function decrement() {
        if (limited && units > min) units -= 1;
    }
</script>

<div class="flex flex-col gap-4">
    <Title level={3} variant="field" color="secondary">
        {$t("pages.project.edit.rewards.modal.unitsExisting")}
    </Title>

    <div class="flex items-center gap-10">
        <div class="flex gap-4">
            <button
                type="button"
                onclick={decrement}
                disabled={isInfinite || units <= min}
                class="flex cursor-pointer items-center justify-center disabled:opacity-50"
            >
                <MoreAndLess sign="less" />
            </button>

            {#if isInfinite}
                <InfinityIcon class="text-secondary" width="32" height="32" />
            {:else}
                <span class="text-secondary w-fit text-center text-3xl font-bold">{units}</span>
            {/if}

            <button
                type="button"
                onclick={increment}
                disabled={isInfinite}
                class="flex cursor-pointer items-center justify-center disabled:opacity-50"
            >
                <MoreAndLess sign="more" />
            </button>
        </div>

        <label class="text-content flex cursor-pointer items-center gap-2 text-base font-normal">
            <Checkbox bind:checked={isInfinite} />
            {$t("domain.project.reward.isInfinite")}
        </label>
    </div>
</div>
