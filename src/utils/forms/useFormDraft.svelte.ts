import {
    getRecoveredForm,
    registerFormDraft,
    unregisterFormDraft,
} from "../../stores/formDraftsStore";

/**
 * Keeps the values of a form across a language switch.
 *
 * The form hands over a getter with the values worth keeping. Everything it does not return
 * is left out, which is how sensitive fields — passwords, tax ids — stay out of the storage:
 * they are simply never offered.
 *
 * The getter is only read when the language changes, so a form that sits still costs
 * nothing, and the values are written down once, right before the page is replaced.
 *
 * @param formId Identifier of the form. Forms rendered more than once need their own id.
 * @param getValues Returns the values to keep. Must not return anything sensitive.
 */
export function useFormDraft<T extends object>(
    formId: string,
    getValues: () => T,
): {
    /** Values recovered after a language switch, if there were any. */
    restored: Partial<T> | undefined;
} {
    const restored = getRecoveredForm(formId) as unknown as Partial<T> | undefined;

    $effect(() => {
        registerFormDraft(formId, getValues as () => Record<string, unknown>);

        return () => unregisterFormDraft(formId);
    });

    return { restored };
}

/**
 * Puts the recovered values back into a form.
 *
 * The fields the draft does not hold are left as they are, so a draft that only knows part of
 * a form never wipes the rest of it.
 *
 * @param state The state of the form.
 * @param restored The values recovered after a language switch.
 * @param fields The fields to restore. All of them when it is not given.
 */
export function restoreFields<T extends object>(
    state: T,
    restored: Partial<T> | undefined,
    fields?: readonly (keyof T)[],
): void {
    if (!restored) return;

    for (const [key, value] of Object.entries(restored)) {
        if (value === undefined) continue;
        if (fields && !fields.includes(key as keyof T)) continue;

        (state as Record<string, unknown>)[key] = value;
    }
}
