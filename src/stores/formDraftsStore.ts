import { get, writable } from "svelte/store";

import { isSupportedLocale, type Locale } from "../i18n/locales";
import { locale } from "../i18n/store";

/**
 * Drafts of the forms the visitor has filled in, kept so a language switch does not throw
 * the work away.
 *
 * Switching the UI language is a full navigation (see `UiLanguages.svelte`), so every island
 * unmounts and whatever it held in `$state` is gone. A plain variable would not survive that,
 * hence `sessionStorage`: it lives as long as the tab does, which is exactly the lifetime a
 * half-filled form is worth.
 *
 * Nothing is written until the language actually changes: the forms of the page register
 * here, and their values are read at that moment, when the page is about to go away.
 */
const STORAGE_KEY = "goteo-form-drafts";

export interface FormDraftSnapshot {
    /** Language the drafts were written under. */
    locale: Locale;
    savedAt: number;
    /** Draft values keyed by form id. */
    forms: Record<string, Record<string, unknown>>;
}

/**
 * The forms of this page and how to read their values.
 *
 * The values are read when the language changes, not while they are typed, so a form that
 * sits still costs nothing.
 */
const registry = new Map<string, () => Record<string, unknown>>();

/**
 * Drafts recovered on this page load.
 *
 * Kept in memory on purpose: the persistent copy is dropped as soon as it is recovered, and
 * this one lives as long as the page does, so a form that mounts later (a modal the visitor
 * has not opened yet) can still pick its values up.
 */
const recoveredForms = writable<Record<string, Record<string, unknown>>>({});

function isBrowser(): boolean {
    return typeof window !== "undefined";
}

/**
 * Language the current page is rendered in.
 *
 * `documentElement.lang` is written by the server on every page, so it is the one source that
 * is right before any island hydrates. The locale store cannot answer this: it starts on the
 * default language and is only corrected once the app island mounts, which may happen after
 * the form that needs the answer.
 */
function getPageLocale(): Locale {
    if (isBrowser()) {
        const fromDocument = document.documentElement.lang;

        if (isSupportedLocale(fromDocument)) return fromDocument;

        const fromPath = window.location.pathname.split("/").filter(Boolean)[0];

        if (isSupportedLocale(fromPath)) return fromPath;
    }

    return import.meta.env.PUBLIC_DEFAULT_LANGUAGE as Locale;
}

/**
 * Registers a form, so its values can be read when the language changes.
 */
export function registerFormDraft(formId: string, getValues: () => Record<string, unknown>): void {
    registry.set(formId, getValues);
}

/**
 * Forgets a form, for when it is no longer on the page.
 */
export function unregisterFormDraft(formId: string): void {
    registry.delete(formId);
}

/**
 * Writes down what the forms of this page hold.
 *
 * This is the only moment anything is written to the storage: the language is changing and
 * the page is about to be replaced, so the values have to outlive it.
 */
export function persistFormDrafts(): void {
    if (!isBrowser() || registry.size === 0) return;

    const forms: Record<string, Record<string, unknown>> = {};

    for (const [formId, getValues] of registry) {
        forms[formId] = getValues();
    }

    const snapshot: FormDraftSnapshot = {
        locale: getPageLocale(),
        savedAt: Date.now(),
        forms,
    };

    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
        console.error("Form drafts could not be saved:", e);
    }
}

/**
 * Reads what was written down, if the storage holds anything.
 */
function readSnapshot(): string | null {
    if (!isBrowser()) return null;

    try {
        return sessionStorage.getItem(STORAGE_KEY);
    } catch (e) {
        console.error("Form drafts could not be read:", e);
        return null;
    }
}

/**
 * Reads what was written down and drops the persistent copy right away.
 *
 * Only a page served in another language gets the values back: that is what tells a language
 * switch apart from an ordinary reload.
 */
export function recoverFormDrafts(): void {
    const raw = readSnapshot();

    if (!raw) return;

    // Once read, the values live in memory and the copy in the storage is of no use.
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.error("Form drafts could not be removed:", e);
    }

    let snapshot: FormDraftSnapshot;

    try {
        snapshot = JSON.parse(raw) as FormDraftSnapshot;
    } catch (e) {
        console.error("Form drafts could not be parsed:", e);
        return;
    }

    if (!snapshot?.forms) return;

    if (snapshot.locale === getPageLocale()) return;

    recoveredForms.set(snapshot.forms);
}

/**
 * Values recovered for a form, if any.
 */
export function getRecoveredForm(formId: string): Record<string, unknown> | undefined {
    return get(recoveredForms)[formId];
}

/**
 * The page's language is known from the server-rendered document, so what was written down
 * before a language switch can be picked up as soon as this module is loaded, which happens
 * before any form hydrates.
 */
recoverFormDrafts();

let settled = false;

/**
 * The language state drives the rest.
 *
 * When it moves to a language the page is not in, the visitor is switching and what the
 * forms hold is written down before the page goes away. When it settles on the page's
 * language, what was written down is read back.
 */
locale.subscribe((next) => {
    if (!isBrowser()) return;

    // The store starts on the default language and the app sets the page's language when it
    // hydrates. That first value says nothing about a switch.
    if (!settled) {
        settled = true;
        return;
    }

    if (next === getPageLocale()) {
        recoverFormDrafts();
        return;
    }

    persistFormDrafts();
});
