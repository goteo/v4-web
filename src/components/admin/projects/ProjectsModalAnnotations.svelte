<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import { t } from "../../../i18n/store";
    import Button from "../../library/buttons/Button.svelte";
    import TextArea from "../../library/inputs/TextArea.svelte";

    interface Props {
        open: boolean;
        annotationText: string;
        onsave?: (text: string) => void;
    }

    let { open = $bindable(false), annotationText = $bindable(""), onsave }: Props = $props();
</script>

<Modal
    bind:open
    title={$t("pages.admin.projects.modals.annotations.title")}
    closeBtnClass="top-4 end-4 bg-transparent text-secondary hover:bg-transparent hover:text-secondary focus:ring-0 shadow-none"
    class="backdrop:bg-overlay max-w-lg backdrop:backdrop-blur-[5px]"
>
    <div class="flex flex-col gap-4">
        <TextArea
            id="annotations-input"
            bind:value={annotationText}
            labelText={$t("pages.admin.projects.modals.annotations.placeholder")}
        />
        {#if !annotationText}
            <p class="text-content text-sm">
                {$t("pages.admin.projects.modals.annotations.empty")}
            </p>
        {:else}{/if}
        <div class="flex justify-end">
            <Button kind="primary" onclick={() => onsave?.(annotationText)}>
                {#if annotationText}
                    {$t("pages.admin.projects.modals.annotations.modify")}
                {:else}
                    {$t("pages.admin.projects.modals.annotations.add")}
                {/if}
            </Button>
        </div>
    </div>
</Modal>
