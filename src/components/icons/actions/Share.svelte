<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    interface Props {
        class?: ClassNameValue;
        width?: string | number;
        height?: string | number;
    }

    let { class: classes = "", width = "32", height = "32" }: Props = $props();
</script>

<svg
    {width}
    {height}
    viewBox="0 1.5 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class={twMerge("text-secondary", classes)}
>
    <path
        d="M12 19.6875L20 24.0625M20 10.9375L12 15.3125M24 30.625C21.7909 30.625 20 28.6662 20 26.25C20 23.8338 21.7909 21.875 24 21.875C26.2091 21.875 28 23.8338 28 26.25C28 28.6662 26.2091 30.625 24 30.625ZM8 21.875C5.79086 21.875 4 19.9162 4 17.5C4 15.0838 5.79086 13.125 8 13.125C10.2091 13.125 12 15.0838 12 17.5C12 19.9162 10.2091 21.875 8 21.875ZM24 13.125C21.7909 13.125 20 11.1662 20 8.75C20 6.33375 21.7909 4.375 24 4.375C26.2091 4.375 28 6.33375 28 8.75C28 11.1662 26.2091 13.125 24 13.125Z"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
    />
</svg>
