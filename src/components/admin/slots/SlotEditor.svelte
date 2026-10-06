<script lang="ts" generics="T">
    import { Modal } from "flowbite-svelte";
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import { t } from "../../../i18n/store";
    import { debounce } from "../../../utils/debounce";
    import ActionableButton from "../../library/buttons/ActionableButton.svelte";
    import Button from "../../library/buttons/Button.svelte";
    import DropdownMenu from "../../library/dropdown/DropdownMenu.svelte";
    import Toast from "../../library/feedback/Toast.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { SlotContent, SlotLabels } from "./slots.types";
    import type { DropdownOption } from "../../library/dropdown/dropdown.types";

    interface Props {
        class?: ClassNameValue;

        /** Values already assigned, in display order. Shorter than `maxSlots` leaves gaps at the end. */
        contents: readonly SlotContent<T>[];

        /** Sizing and rounding of the media preview. Defaults to a square thumbnail. */
        previewClass?: ClassNameValue;

        /** How many slots to render. */
        maxSlots: number;

        labels: SlotLabels;

        /** Resolves a search term into assignable values. Called at most every 300ms. */
        search: (query: string) => Promise<SlotContent<T>[]>;

        /** Persists the assigned values in slot order. */
        onSave: (slots: SlotContent<T>[]) => Promise<{ error?: { message: string } } | void>;
    }

    let {
        class: classes = "",
        contents,
        previewClass = "size-24 rounded-2xl",
        maxSlots,
        labels,
        search,
        onSave,
    }: Props = $props();

    /**
     * Indexed by slot position, so emptying a slot leaves the others where the
     * user put them instead of compacting them upwards. Gaps are only collapsed
     * at save time, which is what the persistence layer expects.
     */
    let assignments = $state<(SlotContent<T> | undefined)[]>([...contents]);
    let pickerOpen = $state(false);
    let editingIndex = $state<number | null>(null);
    let query = $state("");
    let options = $state<DropdownOption[]>([]);
    let picked = $state<DropdownOption[]>([]);
    /** Last results, kept so confirming an option can recover the full value. */
    let candidates = $state<SlotContent<T>[]>([]);
    let showError = $state(false);
    let errorMessage = $state("");

    const runSearch = debounce(async (term: string) => {
        candidates = await search(term);
        options = candidates.map((c, i) => ({
            id: String(i),
            label: c.label,
            selected: false,
        }));
    });

    function handleSearch(term: string) {
        const trimmed = term.trim();

        if (trimmed.length < 2) {
            runSearch.cancel();
            options = [];
            candidates = [];
            return;
        }

        runSearch(trimmed);
    }

    function openPicker(index: number) {
        editingIndex = index;
        query = "";
        options = [];
        candidates = [];
        picked = [];
        pickerOpen = true;
    }

    function handleConfirm() {
        if (editingIndex === null || picked.length === 0) return;

        const chosen = candidates[Number(picked[0].id)];
        if (!chosen) return;

        const next = [...assignments];
        next[editingIndex] = chosen;
        assignments = next;

        pickerOpen = false;
        editingIndex = null;
    }

    async function handleSave() {
        // Array order is slot order, so gaps just drop out and the feature
        // receives a dense, ordered list. `value` stays opaque.
        const filled = assignments
            .slice(0, maxSlots)
            .filter((slot): slot is SlotContent<T> => slot !== undefined);

        const { error } = (await onSave(filled)) ?? {};

        if (error) {
            errorMessage = error.message;
            showError = true;
        }
    }
</script>

<div class={twMerge("flex flex-col gap-10", classes)}>
    <header class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-2">
            <Title level={2} variant="headline">{labels.title}</Title>
            <p class="text-content text-base">{labels.description}</p>
        </div>
        <ActionableButton action={handleSave} autoreset={2000} class="w-fit shrink-0 px-6">
            {$t("common.save")}
        </ActionableButton>
    </header>

    <section class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
            <Title level={3} variant="subsection">{labels.selectionTitle}</Title>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
            {#each Array.from({ length: maxSlots }, (_, index) => assignments[index]) as slot, index (index)}
                <div class="border-grey flex items-center gap-6 rounded-3xl border bg-white p-6">
                    {#if slot}
                        {#if slot.imageUrl}
                            <img
                                src={slot.imageUrl}
                                alt={slot.label}
                                class={twMerge(
                                    "shrink-0 overflow-hidden object-cover",
                                    previewClass,
                                )}
                            />
                        {/if}

                        <div class="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                            <p class="text-secondary font-bold">{slot.label}</p>
                            {#if slot.description}
                                <p class="text-content text-body-small">{slot.description}</p>
                            {/if}
                            <Button
                                kind="secondary"
                                size="sm"
                                class="mt-1 rounded-full font-normal"
                                onclick={() => openPicker(index)}
                            >
                                {labels.change}
                            </Button>
                        </div>
                    {:else}
                        <div class="flex min-w-0 flex-1 flex-col items-start gap-12">
                            <p class="text-content text-base">{labels.empty}</p>
                            <Button
                                kind="secondary"
                                size="sm"
                                class="font-normal"
                                onclick={() => openPicker(index)}
                            >
                                {labels.add}
                            </Button>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </section>
</div>

<Toast variant="error" bind:showToast={showError}>{errorMessage}</Toast>

<Modal
    bind:open={pickerOpen}
    closeBtnClass="top-3 end-3 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="fixed top-1/2 left-1/2 mx-2 flex w-full max-w-172 -translate-x-1/2 -translate-y-1/2 flex-col gap-6 divide-y-0 overflow-visible rounded-3xl bg-white p-6 shadow-lg backdrop:bg-[#878282B2] backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    headerClass="md:p-0 p-0 border-none"
    bodyClass="md:p-0 p-0 border-none overflow-y-visible"
    footerClass="md:p-0 p-0 border-none flex items-center justify-end gap-4"
>
    {#snippet header()}
        <Title level={2} variant="subsection">{labels.modalTitle}</Title>
    {/snippet}

    <div class="flex flex-col gap-6">
        <p class="text-content text-base font-normal">{labels.modalDescription}</p>
        <div class="relative">
            {#if query}
                <span
                    class="text-secondary absolute top-0 left-4 z-10 -translate-y-1/2 transform bg-white px-1 text-sm font-medium"
                >
                    {labels.searchPlaceholder}
                </span>
            {/if}
            <DropdownMenu
                variant="basic"
                hasSearch
                singleSelect
                clearable
                {options}
                bind:selected={picked}
                bind:searchValue={query}
                onSearch={handleSearch}
                searchClasses="rounded-3xl border-secondary shadow-none"
                searchPlaceholder={labels.searchPlaceholder}
            />
        </div>
    </div>

    {#snippet footer()}
        <Button kind="ghost" onclick={() => (pickerOpen = false)} class="w-fit">
            {$t("common.cancel")}
        </Button>
        <Button onclick={handleConfirm} class="w-fit">{labels.submit}</Button>
    {/snippet}
</Modal>
