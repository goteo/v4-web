/**
 * Seeds --header-height from the server-rendered header before first paint.
 * The ResizeObserver in Header.svelte only runs once the island hydrates, so without this the
 * var stays at its 0px fallback and <main> jumps down by the header height on hydration
 * (CLS ~0.11 on the home page).
 *
 * Kept as a string because Astro does not hash `is:inline` scripts for the CSP:
 * `astro.config.mjs` hashes this exact text, and `Layout.astro` renders it with `set:html`.
 */
export const headerHeightScript = `const header = document.getElementById("header-measure");

if (header) {
    document.documentElement.style.setProperty(
        "--header-height",
        \`\${header.getBoundingClientRect().bottom}px\`,
    );
}`;
