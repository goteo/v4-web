<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import { t } from "../../i18n/store";

    interface Props {
        /** SDG number, 1 to 17. */
        goal: number;
        class?: ClassNameValue;
    }

    let { goal, class: classes = "" }: Props = $props();

    let title = $derived($t(`pages.project.view.tabs.project.sdg.goals.${goal}.title`));
</script>

<!-- The SVG only has background and pictogram: number and title are text, so they translate. -->
<div
    role="img"
    aria-label={`${goal}. ${title}`}
    class={twMerge("@container relative size-24 shrink-0", classes)}
>
    <img src={`/images/sdg/sdg-${goal}.svg`} alt="" loading="lazy" class="size-full" />
    <div
        class="font-condensed absolute inset-x-[6%] top-[6.5%] flex items-start gap-[5%] text-white uppercase"
    >
        <span class="text-[24cqw] leading-[0.9] font-bold">{goal}</span>
        <span class="text-[8.6cqw] leading-[1.33] font-medium">{title}</span>
    </div>
</div>
