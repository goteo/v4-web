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
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class={twMerge("text-secondary", classes)}
>
    <path d="M7 8V24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
    <path
        d="M13 11H25M13 16H25M13 21H21"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
    />
</svg>
