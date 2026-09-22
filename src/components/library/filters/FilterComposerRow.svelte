<script lang="ts">
    import { t } from "../../../i18n/store";
    import Close from "../../icons/navigation/Close.svelte";
    import DropdownMenu from "../dropdown/DropdownMenu.svelte";
    import DateInput from "../inputs/DateInput.svelte";
    import ResourceSearch from "../inputs/ResourceSearch.svelte";
    import Select from "../inputs/Select.svelte";
    import TextInput from "../inputs/TextInput.svelte";
    import AccountingOwnerBadge from "../tags/AccountingOwnerBadge.svelte";

    import type { FilterSubject, FilterOperator } from "../../../utils/filterComposer";
    import type { SearchResultItem } from "../../../utils/resourceSearch";
    import type { DropdownOption } from "../dropdown/dropdown.types";

    interface Props {
        subjects: FilterSubject[];
        subjectKey?: string;
        operator?: FilterOperator | "";
        referent?: string | number | Date | string[];
        onremove: () => void;
    }

    let {
        subjects,
        subjectKey = $bindable(""),
        operator = $bindable("" as FilterOperator | ""),
        referent = $bindable("" as string | number | Date | string[]),
        onremove,
    }: Props = $props();

    let currentSubject = $derived(subjects.find((s) => s.key === subjectKey));
    let compatibleOperators = $derived(currentSubject?.compatibleOperators ?? []);

    /** `equals` on a subject that takes a single value — the dropdown closes on pick. */
    let singleSelect = $derived(operator === "equals" && !currentSubject?.allowsMultipleEquals);

    let dropdownSelected = $state<DropdownOption[]>([]);
    let suggestSelected = $state<SearchResultItem[]>([]);

    let dropdownOptions = $derived(
        currentSubject?.options?.map((option) => ({
            id: option.value,
            label: $t(option.label),
            selected: false,
        })) ?? [],
    );

    let previousSubjectKey = $state("");

    $effect(() => {
        if (subjectKey === previousSubjectKey) return;
        previousSubjectKey = subjectKey;
        operator = "";
        referent = "";
        dropdownSelected = [];
        suggestSelected = [];
    });

    function syncReferent() {
        referent = singleSelect
            ? (dropdownSelected[0]?.id ?? "")
            : dropdownSelected.map((option) => option.id);
    }

    function handleSuggestChange(items: SearchResultItem[]) {
        referent = singleSelect ? (items[0]?.value ?? "") : items.map((item) => item.value);
    }

    function subjectLabel(key: string): string {
        return $t(`domain.filterComposer.subject.${key}`);
    }

    function operatorLabel(op: FilterOperator): string {
        return $t(`domain.filterComposer.operator.${op}`);
    }
</script>

{#snippet accountingChip(item: SearchResultItem)}
    <AccountingOwnerBadge accountingIri={item.value} class="text-xs" />
{/snippet}

<div class="flex items-center gap-3">
    <div class="flex-1">
        <Select bind:value={subjectKey} labelText={$t("domain.filterComposer.subjectPlaceholder")}>
            <option value="">{$t("domain.filterComposer.subjectPlaceholder")}</option>
            {#each subjects as subject}
                <option value={subject.key}>{subjectLabel(subject.key)}</option>
            {/each}
        </Select>
    </div>

    <div class="flex-1">
        <Select
            bind:value={operator}
            disabled={!subjectKey}
            labelText={$t("domain.filterComposer.operatorPlaceholder")}
        >
            <option value="">{$t("domain.filterComposer.operatorPlaceholder")}</option>
            {#each compatibleOperators as op}
                <option value={op}>{operatorLabel(op)}</option>
            {/each}
        </Select>
    </div>

    <div class="flex-1">
        {#if currentSubject?.component && operator}
            <currentSubject.component
                value={referent as string}
                onChange={(value: string) => (referent = value)}
                labelText={$t("domain.filterComposer.referentPlaceholder")}
            />
        {:else if currentSubject?.options && operator && !singleSelect}
            <DropdownMenu
                chips
                searchClasses="border-secondary"
                variant="multiselect"
                options={dropdownOptions}
                bind:selected={dropdownSelected}
                onChange={syncReferent}
                label={$t("domain.filterComposer.referentPlaceholder")}
            />
        {:else if currentSubject?.options && operator === "equals"}
            <Select
                bind:value={referent as string}
                labelText={$t("domain.filterComposer.referentPlaceholder")}
            >
                <option value="">{$t("domain.filterComposer.referentPlaceholder")}</option>
                {#each currentSubject.options as opt}
                    <option value={opt.value}>{$t(opt.label)}</option>
                {/each}
            </Select>
        {:else if currentSubject?.suggest && operator}
            <ResourceSearch
                search={currentSubject.suggest}
                multiple={!singleSelect}
                bind:selected={suggestSelected}
                label={$t("domain.filterComposer.referentPlaceholder")}
                placeholder={$t("domain.filterComposer.referentPlaceholder")}
                highlight={false}
                onChange={handleSuggestChange}
                chip={currentSubject.display === "accountingOwner" ? accountingChip : undefined}
            />
        {:else if currentSubject?.type === "date"}
            <DateInput
                value={typeof referent === "string" && referent ? new Date(referent) : new Date()}
                disabled={!subjectKey || !operator}
                onInput={(date) => (referent = date)}
                hasValue={!!(typeof referent === "string" && referent)}
                labelText={$t("domain.filterComposer.referentPlaceholder")}
            />
        {:else if currentSubject?.type === "number"}
            <TextInput
                bind:value={referent as number}
                disabled={!subjectKey || !operator}
                type="number"
                labelText={$t("domain.filterComposer.referentPlaceholder")}
            />
        {:else}
            <TextInput
                bind:value={referent as string}
                disabled={!subjectKey || !operator}
                labelText={$t("domain.filterComposer.referentPlaceholder")}
            />
        {/if}
    </div>

    <button
        type="button"
        onclick={onremove}
        class="mb-0.5 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white"
        aria-label={$t("domain.filterComposer.removeFilter")}
    >
        <Close />
    </button>
</div>
