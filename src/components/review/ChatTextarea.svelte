<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import { t } from "../../i18n/store";
    import Send from "../icons/actions/Send.svelte";

    let { class: classes = "" } = $props<{
        class?: ClassNameValue;
    }>();
</script>

<div class={twMerge("flex w-full max-w-340 items-center gap-6 self-center", classes)}>
    <textarea
        class="text-content bg-grey h-20 w-full resize-none rounded-lg border-0 p-4 text-base shadow-sm ring-0"
        placeholder={$t("pages.review.chat.placeholder")}></textarea>
    <button
        class="border-grey flex aspect-square size-10 shrink-0 cursor-pointer items-center justify-center rounded-[80px] border bg-white p-2 shadow-[0_2px_4px_0_rgba(0,0,0,0.16)]"
        ><Send /></button
    >
</div>
