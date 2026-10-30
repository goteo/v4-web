<!--
    MotivatingProjectsSection Component

    A card with a multi select of the platform Categories, used to point the promoter 
    at the kind of projects they back.
-->
<script lang="ts">
    import { t } from "../../../i18n/store";
    import CategorySelect from "../../library/inputs/CategorySelect.svelte";
    import Title from "../../library/typography/Title.svelte";

    import type { Category } from "../../../openapi/client";

    interface Props {
        /** Categories offered by the API, `apiCategoriesGetCollection` */
        options: Category[];
        selected?: Category[];
        onChange?: (selected: Category[]) => void;
    }

    let { options, selected = $bindable([]), onChange }: Props = $props();

    // `CategorySelect` derives its checked state from ids, the caller works with whole Categories
    let selectedIds = $derived(selected.map((option) => option.id!));
</script>

<section class="border-grey flex flex-col gap-10 rounded-4xl border bg-white p-8 shadow-sm">
    <div class="space-y-2">
        <Title class="text-2xl" color="secondary" level={2} variant="subsection">
            {$t("pages.me.manage.motivatingProjects.title")}
        </Title>
        <p class="text-content self-stretch text-base font-normal">
            {$t("pages.me.manage.motivatingProjects.subtitle")}
        </p>
    </div>

    <CategorySelect bind:selected {selectedIds} {options} onChange={(next) => onChange?.(next)} />
</section>
