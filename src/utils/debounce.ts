/**
 * Delays `fn` until `ms` have passed without another call. Each call cancels
 * the pending one; `cancel()` drops it without running.
 */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms = 300) {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const debounced = (...args: A) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };

    debounced.cancel = () => clearTimeout(timer);

    return debounced;
}
