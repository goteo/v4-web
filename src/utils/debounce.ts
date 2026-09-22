/**
 * Delay `fn` until `ms` have passed without another call. Each call resets the timer.
 */
export function debounce<A extends unknown[]>(
    fn: (...args: A) => void,
    ms: number,
): ((...args: A) => void) & { cancel: () => void } {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const debounced = (...args: A) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };

    debounced.cancel = () => clearTimeout(timer);

    return debounced;
}
