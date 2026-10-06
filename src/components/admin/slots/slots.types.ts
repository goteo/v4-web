/**
 * Shapes shared by the reusable slot editor and the admin features built on it.
 * @see ../slots/SlotEditor.svelte
 */

/**
 * One filled slot.
 *
 * `value` is opaque to the editor: it carries whatever the surrounding feature
 * needs to persist (a user id, a project id, a whole record) and is handed back
 * untouched on save. That is what lets the same editor drive features whose
 * entities have nothing in common.
 */
export interface SlotContent<T = unknown> {
    /** Entity assigned to the slot, opaque to the editor. */
    value: T;

    /** Text shown under the preview. */
    label: string;

    /** Secondary line under the label, e.g. the handle. */
    description: string;

    /** Picture shown in the slot preview (an avatar, a project image). */
    imageUrl: string | null;
}

/**
 * Every string the editor renders.
 *
 * Passed in rather than resolved from a fixed i18n namespace so each feature
 * keeps its own keys and wording, and so the editor stays feature-agnostic.
 */
export interface SlotLabels {
    /** Heading above the whole editor. */
    title: string;

    /** Supporting copy under the heading. */
    description: string;

    /** Heading of the slot grid. */
    selectionTitle: string;

    /** Shown in a slot that has nothing assigned. */
    empty: string;

    /** Adds a value to an empty slot. */
    add: string;

    /** Replaces the value already in a filled slot. */
    change: string;

    /** Heading of the value picker modal. */
    modalTitle: string;

    /** Supporting copy inside the picker modal. */
    modalDescription: string;

    /** Placeholder of the picker search field. */
    searchPlaceholder: string;

    /** Confirms the value picked in the modal. */
    submit: string;
}
