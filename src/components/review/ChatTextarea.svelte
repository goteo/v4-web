<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import { t } from "../../i18n/store";
    import Send from "../icons/actions/Send.svelte";

    interface Props {
        class?: ClassNameValue;
        /** Message being written, two-way bound so the sender can clear it. */
        value?: string;
        disabled?: boolean;
        onSend?: () => void;
    }

    let { class: classes = "", value = $bindable(""), disabled = false, onSend }: Props = $props();

    let isEmpty = $derived(!value.trim());

    function handleKeydown(event: KeyboardEvent) {
        // Enter sends, Shift+Enter breaks the line, the convention of every chat client.
        if (event.key !== "Enter" || event.shiftKey) return;

        event.preventDefault();
        handleSend();
    }

    function handleSend() {
        if (disabled || isEmpty) return;

        onSend?.();
    }
</script>

<div class={twMerge("flex w-full max-w-340 items-center gap-6 self-center", classes)}>
    <textarea
        bind:value
        {disabled}
        onkeydown={handleKeydown}
        class="text-content bg-grey h-20 w-full resize-none rounded-lg border-0 p-4 text-base shadow-sm ring-0 disabled:cursor-not-allowed"
        placeholder={$t("pages.review.chat.placeholder")}></textarea>
    <button
        type="button"
        disabled={disabled || isEmpty}
        onclick={handleSend}
        class="border-grey flex aspect-square size-10 shrink-0 cursor-pointer items-center justify-center rounded-[80px] border bg-white p-2 shadow-[0_2px_4px_0_rgba(0,0,0,0.16)] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={$t("pages.review.chat.send")}
    >
        <Send />
    </button>
</div>
