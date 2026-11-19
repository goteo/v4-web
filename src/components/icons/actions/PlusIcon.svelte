<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    interface Props {
        class?: ClassNameValue;
    }

    let { class: classes }: Props = $props();
</script>

<svg
    class={twMerge(classes)}
    width="26"
    height="26"
    viewBox="0 0 26 26"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
>
    <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M13 2C6.92487 2 2 6.92487 2 13C2 19.0751 6.92487 24 13 24C19.0751 24 24 19.0751 24 13C24 6.92487 19.0751 2 13 2ZM0 13C0 5.8203 5.8203 0 13 0C20.1797 0 26 5.8203 26 13C26 20.1797 20.1797 26 13 26C5.8203 26 0 20.1797 0 13ZM13 8C13.5523 8 14 8.44772 14 9V12H17C17.5523 12 18 12.4477 18 13C18 13.5523 17.5523 14 17 14H14V17C14 17.5523 13.5523 18 13 18C12.4477 18 12 17.5523 12 17V14H9C8.44772 14 8 13.5523 8 13C8 12.4477 8.44772 12 9 12H12V9C12 8.44772 12.4477 8 13 8Z"
        fill="var(--color-secondary)"
    />
</svg>
