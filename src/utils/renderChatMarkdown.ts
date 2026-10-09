import { Marked, Renderer } from "marked";

/**
 * Escapes a plain-text string so it can be placed inside an HTML document
 * without ever being read back as markup.
 */
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Chat-safe renderer for the review conversations.
 *
 * Only the inline formatting a chat understands is kept (bold, italic,
 * strikethrough, blockquotes and lists). Everything that could point the
 * reader off the page or run code is degraded to plain text:
 *
 * - Links never become anchors (no `href`, no `javascript:`), their visible
 *   label is kept as a plain span.
 * - Raw HTML is escaped, so a message cannot smuggle markup, handlers or
 *   embeds into the page.
 * - Images are dropped. Headings, tables and rules are not chat constructs and
 *   are either downgraded or removed.
 * - Code spans and blocks are not part of the chat syntax, so their content is
 *   shown as plain escaped text instead of being highlighted.
 *
 * The instance is separate from the shared `marked` singleton the rest of the
 * site configures (links, for example), which these overrides would break.
 */
const chatMarked = new Marked({ gfm: true, breaks: true });
const chatRenderer = new Renderer();

chatRenderer.link = function (token) {
    const label = this.parser.parseInline(token.tokens ?? []);

    return `<span class="chat-nolink">${label}</span>`;
};

chatRenderer.image = function () {
    return "";
};

chatRenderer.html = function (token) {
    return escapeHtml(token.text);
};

chatRenderer.heading = function (token) {
    return `<strong>${this.parser.parseInline(token.tokens ?? [])}</strong>`;
};

chatRenderer.table = function () {
    return "";
};

chatRenderer.hr = function () {
    return "";
};

chatRenderer.codespan = function (token) {
    return escapeHtml(token.text);
};

chatRenderer.code = function (token) {
    return escapeHtml(token.text);
};

chatMarked.use({ renderer: chatRenderer });

/**
 * Converts a chat message into safe HTML for the bubble.
 *
 * Newlines become line breaks, so the message reads as it was written, and a
 * failure to parse falls back to the escaped plain text rather than an empty
 * bubble.
 * @param rawText The raw message, as stored in the conversation
 * @returns Safe HTML limited to the chat formatting whitelist
 */
export function renderChatMarkdown(rawText: string): string {
    if (!rawText) return "";

    const cleaned = rawText.replace(/\r\n/g, "\n").trim();

    try {
        const result = chatMarked.parse(cleaned, { async: false });

        return typeof result === "string" ? result : escapeHtml(cleaned);
    } catch {
        return escapeHtml(cleaned);
    }
}