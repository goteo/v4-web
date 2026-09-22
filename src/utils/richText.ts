import { generateHTML, generateJSON, generateText, type JSONContent } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import { CharacterCount } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";

export const ALIGNMENTS = ["left", "center", "right"] as const;

export type Alignment = (typeof ALIGNMENTS)[number];

/**
 * Output formats RichTextEditor can read and emit. Tiptap JSON is the canonical one — every other
 * format is derived from it, so anything the schema does not model is lost on the way out.
 */
export type RichTextFormat = "json" | "html" | "markdown" | "text";

export type RichTextValue<F extends RichTextFormat> = F extends "json" ? JSONContent : string;

/**
 * Schema shared by the editor and the converters below. Any extension added here changes the
 * document schema, so RichTextEditor must build its editor from this same list — otherwise a
 * document written by the editor could fail to round-trip through the converters.
 */
export const richTextExtensions = [
    StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        strike: false,
        code: false,
        codeBlock: false,
        link: false,
        underline: false,
    }),
    TextAlign.configure({
        types: ["paragraph"],
        alignments: [...ALIGNMENTS],
        defaultAlignment: "left",
    }),
    TextStyle,
    FontSize,
    CharacterCount,
    Image,
];

export function emptyRichText(): JSONContent {
    return { type: "doc", content: [{ type: "paragraph" }] };
}

/** Browser only — HTML serialization needs a DOM. */
export function richTextToHtml(doc: JSONContent): string {
    return generateHTML(doc, richTextExtensions);
}

/**
 * The markdown serializer and its parser are the heaviest part of this module and nothing outside
 * the editor uses them, so they load on demand. Call `loadMarkdown()` before any markdown
 * conversion — RichTextEditor does it when `format="markdown"`.
 */
let markdown: {
    render: (doc: JSONContent) => string;
    parse: (source: string) => string;
} | null = null;

export async function loadMarkdown(): Promise<void> {
    if (markdown) return;

    const [{ renderToMarkdown }, { marked }] = await Promise.all([
        import("@tiptap/static-renderer/pm/markdown"),
        import("marked"),
    ]);

    markdown = {
        render: (doc) => renderToMarkdown({ content: doc, extensions: richTextExtensions }),
        parse: (source) => marked.parse(source, { async: false }),
    };
}

function requireMarkdown() {
    if (!markdown) {
        throw new Error("[richText] call loadMarkdown() before converting markdown");
    }

    return markdown;
}

export function richTextToMarkdown(doc: JSONContent): string {
    return requireMarkdown().render(doc);
}

export function richTextToPlainText(doc: JSONContent): string {
    return generateText(doc, richTextExtensions, { blockSeparator: "\n" });
}

export function isRichTextEmpty(doc: JSONContent): boolean {
    return richTextToPlainText(doc).trim() === "";
}

/** Browser only — HTML parsing needs a DOM. */
export function htmlToRichText(html: string): JSONContent {
    return generateJSON(html, richTextExtensions) as JSONContent;
}

/** Browser only — goes through HTML, so it inherits the DOM requirement. */
export function markdownToRichText(source: string): JSONContent {
    return htmlToRichText(requireMarkdown().parse(source));
}

export function plainTextToRichText(text: string): JSONContent {
    return {
        type: "doc",
        content: text.split("\n").map((line) => ({
            type: "paragraph",
            ...(line ? { content: [{ type: "text", text: line }] } : {}),
        })),
    };
}

/**
 * Read a value in any supported format into the canonical JSON document.
 * Browser only for `html` and `markdown`.
 */
export function parseRichText<F extends RichTextFormat>(
    value: RichTextValue<F> | undefined,
    format: F,
): JSONContent {
    if (!value) return emptyRichText();
    if (format === "json") return value as JSONContent;

    const source = value as string;

    if (format === "html") return htmlToRichText(source);
    if (format === "markdown") return markdownToRichText(source);

    return plainTextToRichText(source);
}

/**
 * Write the canonical JSON document out in the requested format.
 * Browser only for `html`.
 */
export function serializeRichText<F extends RichTextFormat>(
    doc: JSONContent,
    format: F,
): RichTextValue<F> {
    if (format === "json") return doc as RichTextValue<F>;
    if (format === "html") return richTextToHtml(doc) as RichTextValue<F>;
    if (format === "markdown") return richTextToMarkdown(doc) as RichTextValue<F>;

    return richTextToPlainText(doc) as RichTextValue<F>;
}

/**
 * Drafts saved before rich text moved to Tiptap JSON hold HTML strings. Browser only when the
 * value is still a string.
 */
export function toRichText(value: string | JSONContent | undefined): JSONContent {
    if (!value) return emptyRichText();
    if (typeof value !== "string") return value;

    return htmlToRichText(value);
}
