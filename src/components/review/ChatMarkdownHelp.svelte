<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import { t } from "../../i18n/store";

    interface Props {
        class?: ClassNameValue;
    }

    let { class: classes = "" }: Props = $props();

    let helpItems = $derived([
        $t("pages.review.chat.mdHelpBold"),
        $t("pages.review.chat.mdHelpItalic"),
        $t("pages.review.chat.mdHelpStrike"),
        $t("pages.review.chat.mdHelpQuote"),
    ]);
</script>

<div class={twMerge("group relative", classes)}>
    <button
        type="button"
        aria-label={$t("pages.review.chat.mdHelpTitle")}
        aria-haspopup="dialog"
        aria-describedby="chat-markdown-help"
        class="border-grey flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full border bg-white text-xs text-current"
    >
        ?
    </button>

    <div
        id="chat-markdown-help"
        role="dialog"
        class="border-variant1 bg-grey absolute bottom-full right-0 z-50 mb-2 hidden w-72 rounded-xl border p-3 shadow-lg group-hover:block group-focus-within:block"
    >
        <p class="text-content mb-2 text-xs font-semibold">
            {$t("pages.review.chat.mdHelpTitle")}
        </p>
        <ul class="text-content list-inside list-disc space-y-1 text-xs">
            {#each helpItems as item}
                <li>{item}</li>
            {/each}
        </ul>
        <p class="text-content mt-2 text-xs">{$t("pages.review.chat.mdHelpNote")}</p>
    </div>
</div>