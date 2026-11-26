<script lang="ts">
    import { t } from "../../../i18n/store";
    import SdgIcon from "../SdgIcon.svelte";

    interface Props {
        /** Chosen SDG numbers, 1 to 17. */
        selected: number[];
        max: number;
        onChange: (selected: number[]) => void;
    }

    let { selected, max, onChange }: Props = $props();

    const goals = Array.from({ length: 17 }, (_, i) => i + 1);

    function toggle(goal: number) {
        onChange(
            selected.includes(goal)
                ? selected.filter((g) => g !== goal)
                : [...selected, goal].sort((a, b) => a - b),
        );
    }
</script>

<div class="flex flex-col gap-3">
    <div class="grid w-fit grid-cols-3 gap-3 sm:grid-cols-6">
        {#each goals as goal (goal)}
            {@const isSelected = selected.includes(goal)}

            <button
                type="button"
                aria-pressed={isSelected}
                disabled={!isSelected && selected.length >= max}
                onclick={() => toggle(goal)}
                class="aria-pressed:ring-secondary cursor-pointer rounded-sm ring-offset-2 transition-opacity disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:ring-4"
            >
                <SdgIcon {goal} class="size-24 sm:size-28" />
            </button>
        {/each}
    </div>
    <p class="text-content text-sm" aria-live="polite">
        {$t("pages.project.edit.configuration.sdgs.counter", { count: selected.length, max })}
    </p>
</div>
