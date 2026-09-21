<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import { t } from "../../../i18n/store";
    import Code from "../../icons/media/Code.svelte";
    import Loader from "../feedback/Loader.svelte";

    interface Props {
        url?: string;
    }

    let { url = "" }: Props = $props();

    const iframeCode = $derived(
        `<iframe frameborder="0" height="492px" src="${url}" width="300px" scrolling="no"></iframe>`,
    );

    let iframeModal = $state(false);
    let iframeLoaded = $state(false);
    let copied = $state(false);

    $effect(() => {
        if (iframeModal) {
            iframeLoaded = false;
        }
    });
</script>

<button
    class="flex h-23 w-23 items-center justify-center rounded-2xl shadow-[0_1px_3px_0_rgba(0,0,0,0.1)]"
    onclick={() => (iframeModal = true)}
>
    <Code />
</button>

<Modal
    bind:open={iframeModal}
    closeBtnClass="top-7 end-7 bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent cursor-pointer"
    class="backdrop:bg-overlay left-1/2! max-w-150 p-4 backdrop:backdrop-blur-[5px]"
    title={$t("pages.project.view.share.iframe-modal.title")}
    headerClass="py-2 text-secondary text-2xl"
>
    <p>{$t("pages.project.view.share.iframe-modal.description")}</p>

    <div class="flex w-full flex-row items-stretch justify-center gap-4">
        <div class="flex w-1/2 items-center justify-center rounded-lg border p-4">
            {#if !iframeLoaded}
                <Loader />
            {/if}
            <iframe
                onload={() => (iframeLoaded = true)}
                src={url}
                width="100%"
                height="492px"
                frameborder="0"
                scrolling="no"
                title="Project widget preview"
                class:hidden={!iframeLoaded}
                class="grayscale"
            ></iframe>
        </div>
        <div class="flex w-1/2 rounded-lg border p-4">
            <textarea
                readonly
                class="w-full resize-none border-none focus:ring-0 focus:outline-none"
                rows="4">{iframeCode}</textarea
            >
        </div>
    </div>

    <button
        class="bg-primary text-secondary h-auto w-full cursor-pointer rounded-3xl px-6 py-4 font-bold"
        class:bg-primary={!copied}
        class:bg-variant1={copied}
        onclick={() => {
            navigator.clipboard.writeText(iframeCode);
            copied = true;
            setTimeout(() => (copied = false), 1000);
        }}
    >
        {copied
            ? $t("pages.project.view.share.iframe-modal.btnCopied")
            : $t("pages.project.view.share.iframe-modal.btnCopy")}
    </button>
</Modal>
