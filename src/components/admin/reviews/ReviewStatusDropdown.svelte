<script lang="ts">
    import {
        campaignReviewState,
        CAMPAIGN_REVIEW_STATE_TRIGGER_CLASSES,
    } from "../../../utils/review";
    import DropdownMenu from "../../library/dropdown/DropdownMenu.svelte";

    import type { DropdownOption } from "../../library/dropdown/dropdown.types";

    interface Props {
        /** Options offered by the dropdown, including the status currently held. */
        options: DropdownOption[];
        /** Raw status the project holds right now. */
        value?: string;
        /** Label of the current status, shown when the dropdown has no selection. */
        label: string;
        disabled?: boolean;
        onChange: (status: string) => void;
    }

    let { options, value, label, disabled = false, onChange }: Props = $props();

    /**
     * The dropdown keeps the picked option internally until it is remounted. A
     * decision is only final after confirmation, so the trigger must keep showing
     * the project's real status instead of the option that was just clicked.
     */
    let picks = $state(0);

    let selected = $derived(
        options
            .filter((option) => option.id === value)
            .map((option) => ({ ...option, selected: true })),
    );

    let reviewState = $derived(campaignReviewState(value));
    let buttonClass = $derived(
        reviewState ? CAMPAIGN_REVIEW_STATE_TRIGGER_CLASSES[reviewState] : undefined,
    );

    function handleChange(option: DropdownOption) {
        picks += 1;

        if (option.id !== value) {
            onChange(option.id);
        }
    }
</script>

<div class={disabled ? "pointer-events-none opacity-50" : undefined} aria-disabled={disabled}>
    {#key picks}
        <DropdownMenu
            {options}
            {selected}
            {label}
            {buttonClass}
            variant="basic"
            singleSelect
            onChange={handleChange}
        />
    {/key}
</div>
