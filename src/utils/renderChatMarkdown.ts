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
 * Builds the renderer for the review conversations.
 *
 * Only the inline formatting a chat understands is kept (bold, italic,
 * strikethrough, blockquotes and lists). Everything that could point the
 * reader off the page or run code is degraded to plain text:
 *
 * - Links never become anchors (no `href`, no `javascript:`), their visible
 *   label is kept as a plain span.
 * - Raw HTML is escaped, so a message cannot smuggle markup, handlers or
 *   embeds into the page.
 * - Headings, tables and rules are not chat constructs and are either
 *   downgraded or removed.
 * - Code spans and blocks are not part of the chat syntax, so their content is
 *   shown as plain escaped text instead of being highlighted.
 *
 * `allowLinksAndImages` relaxes the two rules that keep a reader on the page:
 * links become real anchors opening in a new tab and images are embedded. It is
 * reserved for the messages the consultant admin writes, the one account the
 * platform trusts to point at external content, and never applies to what the
 * promoter sends.
 *
 * Each parser gets its own renderer because the flag is captured per instance;
 * they are also separate from the shared `marked` singleton the rest of the
 * site configures (links, for example), which these overrides would break.
 */
function createRenderer(allowLinksAndImages: boolean): Renderer {
    const renderer = new Renderer();

    renderer.link = function (token) {
        const label = this.parser.parseInline(token.tokens ?? []);

        if (!allowLinksAndImages) {
            return `<span class="chat-nolink">${label}</span>`;
        }

        const title = token.title ? ` title="${escapeHtml(token.title)}"` : "";

        return `<a class="chat-link" href="${escapeHtml(token.href)}"${title} target="_blank" rel="noopener noreferrer nofollow">${label}</a>`;
    };

    renderer.image = function (token) {
        if (!allowLinksAndImages) return "";

        const title = token.title ? ` title="${escapeHtml(token.title)}"` : "";

        return `<img class="chat-image" src="${escapeHtml(token.href)}" alt="${escapeHtml(token.text)}"${title} />`;
    };

    renderer.html = function (token) {
        return escapeHtml(token.text);
    };

    renderer.heading = function (token) {
        return `<strong>${this.parser.parseInline(token.tokens ?? [])}</strong>`;
    };

    renderer.table = function () {
        return "";
    };

    renderer.hr = function () {
        return "";
    };

    renderer.codespan = function (token) {
        return escapeHtml(token.text);
    };

    renderer.code = function (token) {
        return escapeHtml(token.text);
    };

    return renderer;
}

const chatMarked = new Marked({ gfm: true, breaks: true });
chatMarked.use({ renderer: createRenderer(false) });

/** Same whitelist plus anchors and images, for the admin's own messages. */
const chatMarkedRich = new Marked({ gfm: true, breaks: true });
chatMarkedRich.use({ renderer: createRenderer(true) });

export interface ChatMarkdownOptions {
    /** Renders links and images instead of degrading them. Admin-authored only. */
    allowLinksAndImages?: boolean;
}

/**
 * Converts a chat message into safe HTML for the bubble.
 *
 * Newlines become line breaks, so the message reads as it was written, and a
 * failure to parse falls back to the escaped plain text rather than an empty
 * bubble.
 * @param rawText The raw message, as stored in the conversation
 * @param options Whether to render links and images, for the admin's messages
 * @returns Safe HTML limited to the chat formatting whitelist
 */
export function renderChatMarkdown(rawText: string, options: ChatMarkdownOptions = {}): string {
    if (!rawText) return "";

    const cleaned = rawText.replace(/\r\n/g, "\n").trim();
    const parser = options.allowLinksAndImages ? chatMarkedRich : chatMarked;

    try {
        const result = parser.parse(cleaned, { async: false });

        return typeof result === "string" ? result : escapeHtml(cleaned);
    } catch {
        return escapeHtml(cleaned);
    }
}
