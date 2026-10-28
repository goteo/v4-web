<script lang="ts">
    import { t } from "../../i18n/store";
    import { apiProjectSupportsmoneyTotalGetCollection, type Project } from "../../openapi/client";
    import { formatCurrency } from "../../utils/currencies";
    import Spinner from "../icons/status/Spinner.svelte";

    let {
        project,
        currency,
    }: {
        project: Project;
        currency: string;
    } = $props();

    let projectId = $derived(String(project.id!));

    let money = $state<number>();
    let length = $state<number>();

    $effect(() => {
        apiProjectSupportsmoneyTotalGetCollection({
            query: { project: projectId, anonymous: true },
        }).then(({ data: totalMoney }) => {
            money = totalMoney?.amount ?? 0;
            length = totalMoney?.length ?? 0;
        });
    });
</script>

<div
    class="border-grey flex h-58 w-full cursor-pointer overflow-hidden rounded-4xl border bg-white shadow-sm transition-shadow duration-200 ease-in-out hover:shadow-lg md:flex-row"
>
    <div class="flex h-full w-2/5 shrink-0 overflow-hidden">
        <img
            src="/images/home/card-comunidad.png"
            alt="Community donation"
            class="h-full w-full object-cover"
        />
    </div>
    <div class="flex w-full flex-col justify-center gap-4 p-6">
        <div class="flex flex-col gap-1">
            {#if money === undefined}
                <Spinner />
            {:else}
                <div class="text-sm font-bold text-black">
                    {length}
                    {$t("pages.project.view.tabs.community.anonymous.length")}
                </div>
                <p class="text-2xl font-bold text-black">{formatCurrency(money, currency)}</p>
            {/if}
        </div>
        <div class="text-xl font-bold text-black">
            {$t("pages.project.view.tabs.community.anonymous.title")}
        </div>
        <p class="text-content line-clamp-2 text-sm">
            {$t("pages.project.view.tabs.community.anonymous.description")}
        </p>
    </div>
</div>
