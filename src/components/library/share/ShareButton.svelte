<script lang="ts">
    import { Modal } from "flowbite-svelte";
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import CopyUrl from "./CopyUrl.svelte";
    import Facebook from "./Facebook.svelte";
    import Iframe from "./Iframe.svelte";
    import X from "./X.svelte";
    import { t } from "../../../i18n/store";
    import ShareIcon from "../../icons/actions/Share.svelte";

    interface Props {
        shareText?: string;
        variant?: "blog" | "project" | "profile";
        projectSlug?: string;
        url?: string;
        buttonClass?: ClassNameValue;
    }

    let {
        shareText = "",
        variant = "project",
        projectSlug = "",
        url = "",
        buttonClass = "",
    }: Props = $props();

    const widgetUrl = $derived(
        variant === "project" ? `https://www.goteo.org/widget/project/${projectSlug}` : "",
    );

    let openModal = $state(false);

    const modalTitle = $derived(
        variant === "blog"
            ? $t("pages.blog.share.modal.title")
            : variant === "profile"
              ? $t("pages.profile.shareModal.title")
              : $t("pages.project.view.share.modal.title"),
    );

    const modalDescription = $derived(
        variant === "blog"
            ? $t("pages.blog.share.modal.description")
            : variant === "profile"
              ? ""
              : $t("pages.project.view.share.modal.description"),
    );
</script>

<button
    onclick={() => (openModal = true)}
    class={twMerge(
        "text-secondary flex cursor-pointer flex-row items-center gap-2 p-2 font-bold",
        buttonClass,
    )}
>
    <ShareIcon />
    {$t("common.share")}
</button>

<Modal
    bind:open={openModal}
    closeBtnClass="top-7 end-7 bg-transparent text-secondary hover:bg-transparent hover:text-secondary hover:scale-110 transition-transform duration-200 transform focus:ring-0 shadow-none dark:text-secondary dark:hover:text-secondary dark:hover:bg-transparent cursor-pointer"
    class="backdrop:bg-overlay fixed top-1/2 left-1/2 w-full max-w-118.75 -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-lg backdrop:backdrop-blur-[5px]"
    title={modalTitle}
    headerClass="py-2 text-secondary text-2xl"
>
    {#if modalDescription}
        <p>{modalDescription}</p>
    {/if}

    <div class="flex flex-row items-center justify-center gap-6">
        <CopyUrl {url} />
        <Facebook {url} />
        <X text={shareText} {url} />
        {#if variant === "project"}
            <Iframe url={widgetUrl} />
        {/if}
    </div>
</Modal>
