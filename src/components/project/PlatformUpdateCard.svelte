<script lang="ts">
    import { twMerge } from "tailwind-merge";

    import Bullet from "../../components/icons/Bullet.svelte";
    import { locale } from "../../i18n/store";
    import { type ProjectUpdate } from "../../openapi/client/index";
    import { formatDate } from "../../utils/dates.ts";
    import Title from "../library/typography/Title.svelte";

    import type { ProjectUpdateCardType } from "./ProjectUpdateCard.svelte";

    const cardStyles = {
        contracted: "h-[24.5rem] w-[21.75rem]",
        expanded: "h-[24.5rem] w-[30.75rem]",
        mobile: "h-[25.625rem] w-[13.5rem]",
    };

    const backgroundSvgStyles = {
        contracted: "-right-40 -bottom-28 h-[34rem] w-[34rem]",
        expanded: "-right-24 -bottom-28 h-[34rem] w-[34rem]",
        mobile: "-right-52 -bottom-10 h-[31rem] w-[31rem]",
    };

    const titleStyles = {
        contracted: "text-double leading-10",
        expanded: "text-double leading-10",
        mobile: "text-2xl leading-8",
    };

    interface Props {
        update: ProjectUpdate;
        type?: ProjectUpdateCardType;
        isActive?: boolean;
    }

    let { update, type = "contracted", isActive }: Props = $props();
</script>

<div
    class={twMerge(
        "flex shrink-0 flex-col rounded-[1.25rem] border border-grey bg-white p-4 shadow-sm transition-[width,opacity,box-shadow] duration-300 ease-out",
        cardStyles[type],
        type === "contracted" && !isActive && "opacity-70",
        isActive && "opacity-100",
    )}
>
    <div class="text-secondary flex shrink-0 flex-row gap-0.5 text-lg leading-6 font-bold">
        {#if update.date}
            {formatDate(new Date(update.date), $locale)}
        {/if}
        <Bullet size={6} />
    </div>

    <div class="mt-3 flex min-h-0 flex-1">
        <div
            class="relative isolate flex h-full min-h-0 overflow-hidden rounded-2xl bg-[#FF4ED1] p-4 text-white"
        >
            <svg
                class={twMerge(
                    "pointer-events-none absolute z-0 max-w-none text-black",
                    backgroundSvgStyles[type],
                )}
                viewBox="0 0 535 533"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    opacity="0.08"
                    d="M339.41 -307.908C341.812 -308.41 342.063 -306.776 342.23 -305.059C382.622 -179.016 441.101 -96.5034 517.041 -10.932C589.701 70.9316 673.723 148.459 680.594 291.679C685.983 404.231 636.839 495.227 584.73 551.849C526.585 615.069 432.183 658.578 333.771 656.504C232.603 654.346 149.792 609.602 91.271 543.386C32.9799 477.443 -7.07829 393.966 1.04613 280.346C12.9717 113.351 138.075 31.8013 218.171 -73.1467C270.238 -141.436 306.579 -212.072 339.41 -307.908ZM130.744 314.323C131.747 390.552 172.849 460.14 229.449 495.332C309.294 544.957 420.362 532.242 486.047 467.011C520.717 432.615 544.254 384.603 550.896 314.323C463.219 314.323 443.211 313.024 341.332 313.024C341.332 243.247 342.251 169.114 342.251 99.3786C220.426 99.0644 129.262 199.781 130.744 314.323Z"
                    fill="currentColor"
                />
            </svg>

            <Title
                level={2}
                variant="subsection"
                color="white"
                class={`relative z-10 ${titleStyles[type]}`}
            >
                {update.title}
            </Title>
        </div>
    </div>
</div>
