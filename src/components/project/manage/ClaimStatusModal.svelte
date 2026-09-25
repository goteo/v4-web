<script lang="ts" module>
    /** Claim status → Tag variant */
    export const CLAIM_STATUSES = {
        sent: "success",
        pending: "warning",
        error: "error",
    } as const;

    export type ClaimStatus = keyof typeof CLAIM_STATUSES;
</script>

<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import { t } from "../../../i18n/store";
    import Button from "../../library/buttons/Button.svelte";
    import Select from "../../library/inputs/Select.svelte";
    import Title from "../../library/typography/Title.svelte";

    let {
        open = $bindable(false),
        status,
        onSave,
    }: {
        open: boolean;
        status?: ClaimStatus;
        onSave: (status: ClaimStatus) => void;
    } = $props();

    let selected = $state("");

    $effect(() => {
        if (open) selected = "";
    });

    function save() {
        onSave(selected as ClaimStatus);
        open = false;
    }
</script>

<Modal
    bind:open
    closeBtnClass="top-6 end-6 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex w-full max-w-167 -translate-x-1/2 -translate-y-1/2 flex-col gap-8 rounded-3xl border-b-0 bg-white p-6 shadow-lg backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    headerClass="border-b-0 md:p-0 p-0 pr-8"
    bodyClass="md:p-0 p-0 border-b-0 flex flex-col gap-8"
    footerClass="md:p-0 p-0 flex items-center justify-end border-b-0"
>
    {#snippet header()}
        <Title level={2} variant="subsection" weight="bold">
            {$t("pages.project.manage.claims.modal.title")}
        </Title>
    {/snippet}
    {#if status}
        <p class="text-content">
            {@html $t(
                "pages.project.manage.claims.modal.current",
                {
                    status: `<strong>“${$t(`pages.project.manage.claims.statuses.${status}`)}”</strong>`,
                },
                { allowHTML: true },
            )}
        </p>
    {/if}
    <Select bind:value={selected}>
        <option value="" disabled>{$t("pages.project.manage.claims.modal.placeholder")}</option>
        {#each Object.keys(CLAIM_STATUSES) as key}
            <option value={key}>{$t(`pages.project.manage.claims.statuses.${key}`)}</option>
        {/each}
    </Select>
    {#snippet footer()}
        <Button disabled={!selected} onclick={save}>
            {$t("pages.project.manage.claims.modal.save")}
        </Button>
    {/snippet}
</Modal>
