<!--
    Tiptap rich text editor with a bold / italic / image / link / list / quote / alignment /
    font-size toolbar. Every tool is on by default and can be hidden with its `show*` prop; hiding
    a tool only removes its button, the document schema stays the same.

    `format` picks the shape of `value` and of what `onChange` reports: Tiptap JSON (the default
    and the canonical one), HTML, Markdown or plain text. The editor always works in JSON
    internally, so any format other than "json" is a lossy projection of the document.

    Content flows one way — there is no two-way binding. `minLength`/`maxLength` only colour the
    character counter; enforcement lives in stores/drafts/draftValidation.ts.
-->
<script lang="ts" generics="F extends RichTextFormat = 'json'">
    import { Editor } from "@tiptap/core";
    import { Placeholder } from "@tiptap/extensions";
    import { tick, untrack, type Component } from "svelte";
    import { twJoin, twMerge, type ClassNameValue } from "tailwind-merge";

    import ImageUploadModal from "./ImageUploadModal.svelte";
    import TextInput from "./TextInput.svelte";
    import { t } from "../../../i18n/store";
    import {
        ALIGNMENTS as ALIGNMENT_VALUES,
        loadMarkdown,
        parseRichText,
        richTextExtensions,
        serializeRichText,
    } from "../../../utils/richText";
    import Align from "../../icons/Align.svelte";
    import ListBullet from "../../icons/editor/ListBullet.svelte";
    import ListOrdered from "../../icons/editor/ListOrdered.svelte";
    import Quote from "../../icons/editor/Quote.svelte";
    import Image from "../../icons/media/Image.svelte";
    import Link from "../../icons/media/Link.svelte";
    import Chevron from "../../icons/navigation/Chevron.svelte";
    import Button from "../buttons/Button.svelte";

    import type { UploadedObject } from "../../../utils/media/objectStorage.types";
    import type { Alignment, RichTextFormat, RichTextValue } from "../../../utils/richText";

    interface RichTextEditorProps {
        id: string;
        value: RichTextValue<F>;
        onChange: (value: RichTextValue<F>) => void;
        format?: F;
        placeholder?: string;
        labelText?: string;
        error?: string;
        ariaDescribedBy?: string;
        class?: ClassNameValue;
        minLength?: number;
        maxLength?: number;
        showFontSize?: boolean;
        showAlignment?: boolean;
        showBold?: boolean;
        showItalic?: boolean;
        showImage?: boolean;
        showLink?: boolean;
        showBulletList?: boolean;
        showOrderedList?: boolean;
        showQuote?: boolean;
    }

    type ToolbarIcon = Component<{ width?: string; height?: string; class?: ClassNameValue }>;

    interface ToolbarButton {
        id: string;
        labelKey: string;
        active: boolean;
        run: () => void;
        align?: Alignment;
        glyph?: { text: string; class: string };
        icon?: ToolbarIcon;
    }

    let {
        id,
        value,
        onChange,
        format = "json" as F,
        placeholder = "",
        labelText,
        error,
        ariaDescribedBy,
        class: className = "",
        minLength,
        maxLength,
        showFontSize = true,
        showAlignment = true,
        showBold = true,
        showItalic = true,
        showImage = true,
        showLink = true,
        showBulletList = true,
        showOrderedList = true,
        showQuote = true,
    }: RichTextEditorProps = $props();

    const ALIGNMENT_LABEL_KEYS: Record<Alignment, string> = {
        left: "domain.richTextEditor.alignLeft",
        center: "domain.richTextEditor.alignCenter",
        right: "domain.richTextEditor.alignRight",
    };

    const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px"];
    const DEFAULT_FONT_SIZE = "16px";

    let editorElement = $state<HTMLDivElement>();
    let editor = $state<Editor | null>(null);
    let showImageModal = $state(false);
    let showLinkPopover = $state(false);
    let linkUrl = $state("");
    let linkPopoverElement = $state<HTMLDivElement>();

    // The markdown converters are loaded on demand, so the editor waits for them before mounting.
    let markdownReady = $state(false);
    const canConvert = $derived(format !== "markdown" || markdownReady);

    let toolbar = $state({
        bold: false,
        italic: false,
        link: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        alignment: "left" as Alignment,
        fontSize: DEFAULT_FONT_SIZE,
        characters: 0,
    });

    const markButtons: ToolbarButton[] = $derived(
        [
            {
                visible: showBold,
                id: "bold",
                labelKey: "domain.richTextEditor.bold",
                active: toolbar.bold,
                run: () => editor?.chain().focus().toggleBold().run(),
                glyph: { text: "B", class: "font-bold" },
            },
            {
                visible: showItalic,
                id: "italic",
                labelKey: "domain.richTextEditor.italic",
                active: toolbar.italic,
                run: () => editor?.chain().focus().toggleItalic().run(),
                glyph: { text: "I", class: "font-serif italic" },
            },
            {
                visible: showImage,
                id: "image",
                labelKey: "domain.richTextEditor.image",
                active: false,
                run: () => (showImageModal = true),
                icon: Image,
            },
            {
                visible: showLink,
                id: "link",
                labelKey: "domain.richTextEditor.link",
                active: toolbar.link || showLinkPopover,
                run: toggleLinkPopover,
                icon: Link,
            },
            {
                visible: showBulletList,
                id: "bulletList",
                labelKey: "domain.richTextEditor.bulletList",
                active: toolbar.bulletList,
                run: () => editor?.chain().focus().toggleBulletList().run(),
                icon: ListBullet,
            },
            {
                visible: showOrderedList,
                id: "orderedList",
                labelKey: "domain.richTextEditor.orderedList",
                active: toolbar.orderedList,
                run: () => editor?.chain().focus().toggleOrderedList().run(),
                icon: ListOrdered,
            },
            {
                visible: showQuote,
                id: "quote",
                labelKey: "domain.richTextEditor.quote",
                active: toolbar.blockquote,
                run: () => editor?.chain().focus().toggleBlockquote().run(),
                icon: Quote,
            },
        ]
            .filter(({ visible }) => visible)
            .map(({ visible: _visible, ...button }) => button),
    );

    const alignButtons: ToolbarButton[] = $derived(
        ALIGNMENT_VALUES.map((alignment) => ({
            id: alignment,
            labelKey: ALIGNMENT_LABEL_KEYS[alignment],
            active: toolbar.alignment === alignment,
            run: () => editor?.chain().focus().setTextAlign(alignment).run(),
            align: alignment,
        })),
    );

    const editorAttributes = $derived({
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-invalid": String(!!error),
        ...(ariaDescribedBy ? { "aria-describedby": ariaDescribedBy } : {}),
        class: "min-h-60 p-4 focus:outline-none",
    });

    const isCountOutOfRange = $derived(
        (minLength !== undefined && toolbar.characters < minLength) ||
            (maxLength !== undefined && toolbar.characters > maxLength),
    );

    function insertImages(files: UploadedObject[]) {
        const chain = editor?.chain().focus();
        // `alt` is always set: the markdown renderer would otherwise emit `![null](src)`.
        files.forEach((file) => chain?.setImage({ src: file.url, alt: file.name }));
        chain?.run();
    }

    function toggleLinkPopover() {
        if (showLinkPopover) {
            closeLinkPopover();
            return;
        }

        linkUrl = editor?.getAttributes("link").href ?? "";
        showLinkPopover = true;
        tick().then(() => linkPopoverElement?.querySelector("input")?.focus());
    }

    function closeLinkPopover() {
        showLinkPopover = false;
        editor?.commands.focus();
    }

    function applyLink() {
        const href = linkUrl.trim();
        const chain = editor?.chain().focus().extendMarkRange("link");

        if (href) chain?.setLink({ href }).run();
        else chain?.unsetLink().run();

        showLinkPopover = false;
    }

    function removeLink() {
        editor?.chain().focus().extendMarkRange("link").unsetLink().run();
        showLinkPopover = false;
    }

    // The editor usually sits inside a page <form>, so the popover cannot be a nested form:
    // Enter and Escape are handled here instead of through a submit.
    function handleLinkKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            applyLink();
        } else if (event.key === "Escape") {
            event.preventDefault();
            closeLinkPopover();
        }
    }

    function syncToolbar(instance: Editor) {
        toolbar.bold = instance.isActive("bold");
        toolbar.italic = instance.isActive("italic");
        toolbar.link = instance.isActive("link");
        toolbar.bulletList = instance.isActive("bulletList");
        toolbar.orderedList = instance.isActive("orderedList");
        toolbar.blockquote = instance.isActive("blockquote");
        toolbar.alignment =
            ALIGNMENT_VALUES.find((alignment) => instance.isActive({ textAlign: alignment })) ??
            "left";
        toolbar.fontSize = instance.getAttributes("textStyle").fontSize ?? DEFAULT_FONT_SIZE;
        toolbar.characters = instance.storage.characterCount.characters();
    }

    function createEditor(element: HTMLDivElement) {
        return new Editor({
            element,
            extensions: [...richTextExtensions, Placeholder.configure({ placeholder })],
            content: parseRichText(value, format),
            editorProps: { attributes: editorAttributes },
            onUpdate: ({ editor: instance }) =>
                onChange(serializeRichText(instance.getJSON(), format)),
            onTransaction: ({ editor: instance }) => syncToolbar(instance),
        });
    }

    $effect(() => {
        if (format !== "markdown") return;

        let active = true;
        loadMarkdown().then(() => {
            if (active) markdownReady = true;
        });

        return () => {
            active = false;
        };
    });

    $effect(() => {
        const element = editorElement;
        if (!element || !canConvert) return;

        const instance = untrack(() => createEditor(element));
        editor = instance;
        untrack(() => syncToolbar(instance));

        return () => {
            instance.destroy();
            editor = null;
        };
    });

    $effect(() => {
        const incoming = value;
        if (!editor) return;

        // Compare in the caller's format: what the editor last reported is what the caller holds,
        // so a re-render with an unchanged value must not reset the document (and the selection).
        const current = serializeRichText(editor.getJSON(), format);
        const isSame =
            format === "json"
                ? JSON.stringify(current) === JSON.stringify(incoming)
                : current === incoming;

        if (!isSame) {
            editor.commands.setContent(parseRichText(incoming, format), { emitUpdate: false });
        }
    });

    $effect(() => {
        editor?.setOptions({ editorProps: { attributes: editorAttributes } });
    });
</script>

{#snippet toolbarButton({ labelKey, active, run, align, glyph, icon: Icon }: ToolbarButton)}
    <button
        type="button"
        onclick={run}
        class={twJoin(
            "flex size-10 cursor-pointer items-center justify-center rounded-lg border bg-white shadow-sm",
            active ? "border-secondary" : "border-grey",
        )}
        aria-label={$t(labelKey)}
        title={$t(labelKey)}
        aria-pressed={active}
    >
        {#if align}
            <Align
                {align}
                width="24"
                height="24"
                class={active ? "text-secondary" : "text-content"}
            />
        {:else if glyph}
            <span class={glyph.class}>{glyph.text}</span>
        {:else if Icon}
            <Icon width="24" height="24" class={active ? "text-secondary" : "text-content"} />
        {/if}
    </button>
{/snippet}

<div class={twMerge("space-y-4", className)}>
    <div
        class="relative flex flex-wrap items-center justify-between gap-2"
        role="toolbar"
        aria-label={$t("domain.richTextEditor.toolbar")}
    >
        <div class="flex flex-wrap items-center gap-2">
            {#if showFontSize}
                <div class="relative flex">
                    <select
                        value={toolbar.fontSize}
                        onchange={(event) =>
                            editor?.chain().focus().setFontSize(event.currentTarget.value).run()}
                        aria-label={$t("domain.richTextEditor.fontSize")}
                        title={$t("domain.richTextEditor.fontSize")}
                        class="border-grey text-secondary flex h-10 w-auto max-w-27.5 cursor-pointer appearance-none items-center justify-center rounded-lg border bg-white bg-none px-2 py-1 pr-8 text-sm shadow-sm ring-0"
                    >
                        {#each FONT_SIZES as size (size)}
                            <option value={size}>{size}</option>
                        {/each}
                    </select>
                    <Chevron
                        direction="down"
                        width="16"
                        height="16"
                        class="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2"
                    />
                </div>
            {/if}

            {#each markButtons as button (button.id)}
                {@render toolbarButton(button)}
            {/each}
        </div>

        {#if showAlignment}
            <div class="flex items-center gap-2">
                {#each alignButtons as button (button.id)}
                    {@render toolbarButton(button)}
                {/each}
            </div>
        {/if}

        {#if showLink && showLinkPopover}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                bind:this={linkPopoverElement}
                onkeydown={handleLinkKeydown}
                class="border-grey absolute top-full left-0 z-10 mt-2 flex w-full max-w-md flex-col gap-3 rounded-lg border bg-white p-3 shadow-sm"
            >
                <TextInput
                    type="url"
                    bind:value={linkUrl}
                    labelText={$t("domain.richTextEditor.linkUrl")}
                    placeholder="https://"
                />
                <div class="flex flex-wrap justify-end gap-2">
                    <Button size="sm" kind="ghost" onclick={closeLinkPopover}>
                        {$t("domain.richTextEditor.linkCancel")}
                    </Button>
                    {#if toolbar.link}
                        <Button size="sm" kind="secondary" onclick={removeLink}>
                            {$t("domain.richTextEditor.linkRemove")}
                        </Button>
                    {/if}
                    <Button size="sm" onclick={applyLink}>
                        {$t("domain.richTextEditor.linkApply")}
                    </Button>
                </div>
            </div>
        {/if}
    </div>

    <div class="relative">
        {#if labelText}
            <label
                for={id}
                class={twJoin(
                    "text-secondary absolute top-0 left-4 -translate-y-1/2 transform bg-white px-1 text-sm font-medium transition-all",
                    error && "text-tertiary",
                )}
            >
                {labelText}
            </label>
        {/if}
        <div
            {id}
            bind:this={editorElement}
            class={twJoin(
                "max-h-100 overflow-y-auto rounded-lg border",
                error ? "border-tertiary" : "border-secondary",
            )}
        ></div>
    </div>

    {#if maxLength !== undefined}
        <p class={twJoin("text-right text-sm", isCountOutOfRange ? "text-tertiary" : "text-black")}>
            {$t("domain.richTextEditor.characterCount", {
                current: toolbar.characters,
                max: maxLength,
            })}
        </p>
    {/if}

    {#if error}
        <p role="alert" class="text-tertiary mt-2 text-sm">{error}</p>
    {/if}
</div>

{#if showImage}
    <ImageUploadModal bind:open={showImageModal} onConfirm={insertImages} />
{/if}

<style>
    :global(.tiptap) {
        font-family: var(--font-body);
        font-size: 16px;
        font-weight: 400;
        color: var(--color-content);
        line-height: 24px;
    }

    :global(.tiptap p) {
        margin: 0;
        margin-bottom: var(--text-lg);
    }

    :global(.tiptap p:last-child) {
        margin-bottom: 0;
    }

    :global(.tiptap strong) {
        font-weight: var(--font-weight-bold);
        color: var(--color-black);
    }

    :global(.tiptap a) {
        color: var(--color-secondary);
        text-decoration: underline;
    }

    :global(.tiptap ul),
    :global(.tiptap ol) {
        padding-left: var(--text-xl);
        margin-bottom: var(--text-lg);
    }

    :global(.tiptap ul) {
        list-style: disc;
    }

    :global(.tiptap ol) {
        list-style: decimal;
    }

    :global(.tiptap li p) {
        margin-bottom: 0;
    }

    :global(.tiptap blockquote) {
        border-left: 4px solid var(--color-primary);
        padding-left: var(--text-lg);
        margin-bottom: var(--text-lg);
    }

    :global(.tiptap img) {
        display: block;
        max-width: 100%;
        height: auto;
        margin-bottom: var(--text-lg);
    }

    :global(.tiptap img.ProseMirror-selectednode) {
        outline: 2px solid var(--color-secondary);
    }

    :global(.tiptap p.is-editor-empty:first-child::before) {
        color: var(--color-content);
        content: attr(data-placeholder);
        float: left;
        height: 0;
        pointer-events: none;
    }
</style>
