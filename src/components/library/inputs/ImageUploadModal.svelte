<!--
    ImageUploadModal Component

    Modal wrapper around FileUpload. Used to pick the project cover image.
    Files are uploaded as soon as they are dropped/selected; "Continue" only
    hands the already uploaded objects back to the caller and closes the modal.
-->
<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import FileUpload from "./FileUpload.svelte";
    import { t } from "../../../i18n/store";
    import Button from "../buttons/Button.svelte";
    import Title from "../typography/Title.svelte";

    import type { UploadedObject } from "../../../utils/media/objectStorage.types";

    interface ImageUploadModalProps {
        open: boolean;
        accept?: string[];
        multiple?: boolean;
        recommendedSize?: string;
        onConfirm: (files: UploadedObject[]) => void;
    }

    let {
        open = $bindable(false),
        accept = ["image/png", "image/jpeg"],
        multiple = false,
        recommendedSize = "1200x900px",
        onConfirm,
    }: ImageUploadModalProps = $props();

    let files = $state<UploadedObject[]>([]);

    function handleConfirm() {
        onConfirm(files);
        files = [];
        open = false;
    }
</script>

<Modal
    bind:open
    closeBtnClass="top-7 end-7 cursor-pointer bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 mx-2 flex w-full max-w-200 -translate-x-1/2 -translate-y-1/2 divide-y-0 bg-transparent backdrop:backdrop-blur-[5px] sm:mx-4 lg:mx-0"
    bodyClass="p-0"
>
    <!-- Stop propagation: flowbite closes the dialog on any click that reaches it -->
    <div
        class="flex flex-col gap-8 rounded-3xl bg-white p-6 shadow-lg"
        role="presentation"
        onclick={(e) => e.stopPropagation()}
    >
        <div class="flex flex-col gap-4">
            <Title level={2} variant="subsection" class="text-content">
                {$t("domain.imageUploadModal.title")}
            </Title>
            <p class="text-content text-base font-normal">
                {$t("domain.imageUploadModal.description", { size: recommendedSize })}
            </p>
        </div>

        <div class="flex flex-col gap-6">
            <FileUpload
                bind:files
                {accept}
                {multiple}
                placeholder={$t("domain.imageUploadModal.dropzone")}
                dropzoneClass="h-80"
            />

            <div class="flex justify-end">
                <Button onclick={handleConfirm} disabled={files.length === 0} class="w-fit">
                    {$t("common.continue")}
                </Button>
            </div>
        </div>
    </div>
</Modal>
