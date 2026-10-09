<script lang="ts">
    import { tick } from "svelte";
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import ChatMarkdownHelp from "./ChatMarkdownHelp.svelte";
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

    let textareaEl = $state<HTMLTextAreaElement | undefined>(undefined);

    let isEmpty = $derived(!value.trim());

    function handleSend() {
        if (disabled || isEmpty) return;

        onSend?.();
    }

    /**
     * Enter sends and Shift+Enter breaks the line, the convention of every chat
     * client. Ctrl/Cmd apply the chat formatting to the selection (or the caret
     * when nothing is selected).
     */
    function handleKeydown(event: KeyboardEvent) {
        const withModifier = event.ctrlKey || event.metaKey;

        if (event.key === "Enter" && !event.shiftKey && !withModifier) {
            event.preventDefault();
            handleSend();

            return;
        }

        // `event.code` is layout independent, so the shortcuts work on any keyboard.
        if (!withModifier) return;

        switch (event.code) {
            case "KeyB":
                event.preventDefault();
                wrapSelection("**");
                break;
            case "KeyI":
                event.preventDefault();
                wrapSelection("*");
                break;
            case "KeyS":
                if (event.shiftKey) {
                    event.preventDefault();
                    wrapSelection("~~");
                }
                break;
            case "KeyQ":
                if (event.shiftKey) {
                    event.preventDefault();
                    togglePrefix("> ");
                }
                break;
        }
    }

    /**
     * Wraps the selection between `delimiter` marks, or plants both marks with the
     * caret in between when nothing is selected, so typing just continues.
     */
    function wrapSelection(delimiter: string): void {
        const el = textareaEl;

        if (!el) return;

        const start = el.selectionStart;
        const selected = value.slice(start, el.selectionEnd);

        value = `${value.slice(0, start)}${delimiter}${selected}${delimiter}${value.slice(el.selectionEnd)}`;

        restoreFocus(start + delimiter.length + selected.length);
    }

    /**
     * Prepends `prefix` (or removes it when already present) on every line the
     * selection covers, which is how the quote and list markers behave.
     */
    function togglePrefix(prefix: string): void {
        const el = textareaEl;

        if (!el) return;

        const blockStart = value.lastIndexOf("\n", el.selectionStart - 1) + 1;
        const nextBreak = value.slice(el.selectionEnd).indexOf("\n");
        const blockEnd = nextBreak === -1 ? value.length : el.selectionEnd + nextBreak;
        const lines = value.slice(blockStart, blockEnd).split("\n");
        const prefixed = new RegExp(`^\\s*${escapeRegExp(prefix)}`);
        const applied = lines.every((line) => line.trim() === "" || prefixed.test(line));
        const next = lines
            .map((line) => (line.trim() === "" ? line : applied ? line.replace(prefixed, "") : `${prefix}${line}`))
            .join("\n");

        value = `${value.slice(0, blockStart)}${next}${value.slice(blockEnd)}`;

        restoreFocus(blockStart + next.length);
    }

    function escapeRegExp(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    /** Returns focus to the field with the caret where the edit left it. */
    function restoreFocus(caret: number): void {
        tick().then(() => {
            const el = textareaEl;

            if (!el) return;

            el.focus();
            el.selectionStart = el.selectionEnd = Math.min(caret, value.length);
        });
    }
</script>

<div class={twMerge("flex w-full max-w-340 flex-col gap-2 self-center", classes)}>
    <div class="flex items-center gap-6">
        <div class="relative h-20 w-full">
            <textarea
                bind:this={textareaEl}
                bind:value
                {disabled}
                onkeydown={handleKeydown}
                class="text-content bg-grey h-full w-full resize-none rounded-lg border-0 p-4 pr-10 text-base shadow-sm ring-0 disabled:cursor-not-allowed"
                placeholder={$t("pages.review.chat.placeholder")}></textarea>
            <ChatMarkdownHelp class="absolute right-2 top-2" />
        </div>
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
</div>