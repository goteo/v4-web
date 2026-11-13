<script lang="ts">
    import { Modal } from "flowbite-svelte";

    import { t } from "../../i18n/store";
    import { renderMarkdown } from "../../utils/renderMarkdown";
    import ShareIcon from "../icons/actions/Share.svelte";
    import AlertIcon from "../icons/status/AlertIcon.svelte";
    import Button from "../library/buttons/Button.svelte";
    import Title from "../library/typography/Title.svelte";

    import type { ProjectUpdate } from "../../openapi/client/index";

    let {
        open = $bindable(),
        update,
    }: {
        open: boolean;
        update: ProjectUpdate | null;
    } = $props();

    function cleanCloseButton() {
        const closeBtn = document.querySelector('button[aria-label="Close"]');
        if (!closeBtn) return;

        closeBtn.removeAttribute("aria-label");
        closeBtn.classList.remove("sr-only");

        closeBtn.querySelectorAll("span").forEach((el) => {
            if (el.textContent?.trim() === "Close") {
                el.remove();
            }
        });
    }

    function shouldShowHeader(dateStr?: string): boolean {
        if (!dateStr) return false;

        const now = new Date();
        const date = new Date(dateStr);
        const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        return diffHours <= 72;
    }

    $effect(() => {
        if (open) cleanCloseButton();
    });
</script>

<Modal
    bind:open
    closeBtnClass="top-7 end-7 bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent cursor-pointer"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 w-full max-w-200 -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-lg backdrop:backdrop-blur-[5px]"
>
    {#if update}
        {#if shouldShowHeader(update.date)}
            <div class="text-secondary flex items-center gap-2 text-base font-bold">
                <AlertIcon />
                {$t("pages.project.view.tabs.updates.modalTitle")}
            </div>
        {/if}
        <Title level={3} variant="section" color="secondary">
            {update.title}
        </Title>
        <div class="marked-content text-content flex flex-col gap-4">
            {#await renderMarkdown(update.body) then content}
                {@html content}
            {/await}
        </div>

        <div class="flex w-full justify-end">
            <Button>
                <ShareIcon />
                {$t("pages.project.view.tabs.updates.content.btn.share")}
            </Button>
        </div>
    {/if}
</Modal>
