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
    <path
        d="M7 8H8.5V13M7 13H10M7 18.5C7 17.7 7.7 17 8.5 17C9.3 17 10 17.7 10 18.4C10 19.5 7 20.5 7 23H10"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
    />
    <path
        d="M14 10H25M14 16H25M14 22H25"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
    />
</svg>
