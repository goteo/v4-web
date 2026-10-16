/**
 * Delays `fn` until `ms` have passed without another call.
 * Each call cancels the previous pending call.
 * `cancel()` drops a pending call without running it.
 */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms = 300) {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const debounced = (...args: A) => {
        if (timer !== undefined) {
            clearTimeout(timer);
        }

        timer = setTimeout(() => {
            timer = undefined;
            fn(...args);
        }, ms);
    };

    debounced.cancel = () => {
        if (timer !== undefined) {
            clearTimeout(timer);
            timer = undefined;
        }
    };

    return debounced;
}
