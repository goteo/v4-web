<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import { t } from "../../i18n/store";
    import Button from "../library/buttons/Button.svelte";
    import DropdownMenu from "../library/dropdown/DropdownMenu.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { DropdownOption } from "../library/dropdown/dropdown.types";

    export interface ReviewOption {
        value: string;
        label: string;
    }

    let {
        open = $bindable(false),
        title,
        options,
        value = "",
        onSelect,
    }: {
        open: boolean;
        /** Heading of the modal, which is also the choice being made. */
        title: string;
        options: ReviewOption[];
        /** Option currently applied, preselected in the dropdown. */
        value?: string;
        /** Called with the chosen option once "Continuar" is pressed. */
        onSelect: (value: string) => void;
    } = $props();

    /**
     * What the dropdown carries. Reset to the applied value every time the modal
     * opens, so the consultant always sees the review as it currently stands.
     */
    let selected = $state<DropdownOption[]>([]);

    $effect(() => {
        if (open) {
            selected = options
                .filter((option) => option.value === value)
                .map((option) => ({ id: option.value, label: option.label, selected: true }));
        }
    });

    let dropdownOptions = $derived(
        options.map((option) => ({
            id: option.value,
            label: option.label,
            selected: option.value === value,
        })),
    );

    function confirm() {
        const next = selected[0]?.id ?? "";

        open = false;
        onSelect(next);
    }
</script>

<Modal
    bind:open
    closeBtnClass="top-3 end-3 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex w-full max-w-120 -translate-x-1/2 -translate-y-1/2 flex-col gap-6 overflow-visible rounded-3xl border-b-0 bg-white p-6 shadow-lg backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    headerClass="border-b-0 md:p-0 p-0"
    bodyClass="md:p-0 p-0 border-b-0 overflow-y-visible"
    footerClass="md:p-0 p-0 flex items-center justify-end gap-4 border-b-0"
>
    {#snippet header()}
        <Title level={2} variant="subsection" color="secondary">
            {title}
        </Title>
    {/snippet}

    <DropdownMenu
        options={dropdownOptions}
        bind:selected
        variant="basic"
        singleSelect
        label={title}
    />

    {#snippet footer()}
        <Button kind="secondary" disabled={!selected.length} onclick={confirm} class="w-fit">
            {$t("common.continue")}
        </Button>
    {/snippet}
</Modal>