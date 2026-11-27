<script lang="ts">
    import { twMerge, type ClassNameValue } from "tailwind-merge";

    import SdgIcon from "./SdgIcon.svelte";
    import { t } from "../../i18n/store";

    import type { Project } from "../../openapi/client";

    interface Props {
        // ponytail: `sdgs` is not in the SDK yet (v4-api will add it); drop it once `pnpm sdk` brings it.
        project: Project & { sdgs?: number[] };
        class?: ClassNameValue;
    }

    let { project, class: classes = "" }: Props = $props();
</script>

{#if project.sdgs?.length}
    <section class={twMerge("w-full rounded-lg border border-black/30 bg-white p-6", classes)}>
        <h2 class="text-base font-bold text-black uppercase">
            {$t("pages.project.view.tabs.project.sdg.title")}
        </h2>

        <div class="mt-4 flex flex-col gap-4">
            {#each project.sdgs as goal (goal)}
                <div class="flex items-start gap-4">
                    <!-- Three lines tall: title (leading-7) + gap-1 + two description lines (leading-5). -->
                    <SdgIcon {goal} class="size-18" />
                    <div class="flex flex-col gap-1">
                        <h3 class="text-xl leading-7 font-medium text-black">
                            {$t(`pages.project.view.tabs.project.sdg.goals.${goal}.title`)}
                        </h3>
                        <p class="text-content text-sm leading-5">
                            {$t(`pages.project.view.tabs.project.sdg.goals.${goal}.description`)}
                        </p>
                    </div>
                </div>
            {/each}
        </div>
    </section>
{/if}
