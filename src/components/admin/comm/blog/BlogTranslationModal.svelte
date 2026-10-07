<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import { languagesList } from "../../../../i18n/locales";
    import { t } from "../../../../i18n/store";
    import Button from "../../../library/buttons/Button.svelte";
    import Select from "../../../library/inputs/Select.svelte";
    import Title from "../../../library/typography/Title.svelte";

    import type { Locale } from "../../../../i18n/locales";

    interface Props {
        open?: boolean;
        /** Locales the post has no texts for yet */
        locales: Locale[];
        onAdd: (locale: Locale) => void;
    }

    let { open = $bindable(false), locales, onAdd }: Props = $props();

    let selected = $state("");

    $effect(() => {
        if (open) selected = "";
    });

    function apply() {
        onAdd(selected as Locale);
        open = false;
    }
</script>

<Modal
    bind:open
    closeBtnClass="top-6 end-6 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex w-full max-w-200 -translate-x-1/2 -translate-y-1/2 flex-col gap-8 rounded-3xl border-b-0 bg-white p-6 shadow-lg backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    headerClass="border-b-0 md:p-0 p-0 pr-8"
    bodyClass="md:p-0 p-0 border-b-0 flex flex-col gap-8"
    footerClass="md:p-0 p-0 flex items-center justify-end border-b-0"
>
    {#snippet header()}
        <Title level={2} variant="subsection" weight="bold">
            {$t("pages.admin.comm.blog.form.translationModal.title")}
        </Title>
    {/snippet}
    <p class="text-content">{$t("pages.admin.comm.blog.form.translationModal.description")}</p>
    <Select bind:value={selected}>
        <option value="" disabled>
            {$t("pages.admin.comm.blog.form.translationModal.placeholder")}
        </option>
        {#each locales as code (code)}
            <option value={code}>{languagesList[code]}</option>
        {/each}
    </Select>
    {#snippet footer()}
        <Button disabled={!selected} onclick={apply}>
            {$t("pages.admin.comm.blog.form.translationModal.apply")}
        </Button>
    {/snippet}
</Modal>
