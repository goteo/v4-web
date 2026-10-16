import { dequal } from "dequal";
import ObservableSlim from "observable-slim";
import { SvelteSet } from "svelte/reactivity";

/**
 * Reactive form state that records which top-level fields differ from the last saved values,
 * so a payload can carry only what the user edited. Nested writes (`links.x`) count towards
 * their top-level field, and a field set back to its saved value stops counting.
 *
 * Call `commit()` after a successful save to make the current values the saved ones.
 */
export function trackChanges<T extends object>(initial: T) {
    const values = $state(initial);
    const changed = new SvelteSet<keyof T>();
    let saved = $state.snapshot(values) as T;

    const form = ObservableSlim.create(values, false, (changes) => {
        for (const { currentPath } of changes) {
            const field = currentPath.split(".")[0] as keyof T;

            if (dequal($state.snapshot(values[field]), saved[field])) {
                changed.delete(field);
            } else {
                changed.add(field);
            }
        }
    });

    function commit() {
        saved = $state.snapshot(values) as T;
        changed.clear();
    }

    return { form, changed, commit };
}
