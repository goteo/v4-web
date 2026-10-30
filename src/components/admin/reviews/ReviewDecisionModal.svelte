<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import { t } from "../../../i18n/store";
    import Button from "../../library/buttons/Button.svelte";
    import Title from "../../library/typography/Title.svelte";

    let {
        open = $bindable(false),
        title,
        description,
        confirmLabel,
        onConfirm,
        onCancel,
    }: {
        open: boolean;
        /** Heading of the modal. */
        title: string;
        /** What is about to happen, already translated. */
        description: string;
        confirmLabel: string;
        onConfirm: () => void;
        onCancel: () => void;
    } = $props();
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

    <p class="text-content text-sm">{description}</p>

    {#snippet footer()}
        <Button kind="ghost" onclick={onCancel}>{$t("common.cancel")}</Button>
        <Button kind="primary" onclick={onConfirm}>{confirmLabel}</Button>
    {/snippet}
</Modal>
