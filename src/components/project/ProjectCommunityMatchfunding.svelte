<script lang="ts">
    import { t } from "../../i18n/store";
    import { formatCurrency } from "../../utils/currencies";

    let { item, openModal = $bindable(), selectedProjectSupport = $bindable() } = $props();
</script>

<button
    class="flex w-full cursor-pointer overflow-hidden rounded-4xl bg-white text-left shadow-sm transition-shadow duration-200 ease-in-out hover:shadow-lg"
    onclick={() => {
        selectedProjectSupport = item;
        openModal = true;
    }}
>
    <div class="bg-tertiary flex w-2/5 shrink-0 items-center justify-center p-6">
        {#if item.displayImage}
            <img src={item.displayImage} alt={item.displayName} class="max-h-full object-contain" />
        {/if}
    </div>
    <div class="border-grey flex w-3/5 flex-col gap-4 rounded-r-4xl border border-l-0 p-6">
        <div class="flex flex-col items-end gap-1">
            <div class="text-sm font-bold text-black">
                {$t("pages.project.view.tabs.community.contribution")}
            </div>
            <p class="text-tertiary text-2xl font-bold">
                {formatCurrency(item.money?.amount ?? 0, item.money?.currency ?? "")}
            </p>
        </div>
        <div class="flex flex-col gap-1">
            <div class="text-xl font-bold text-black">{item.displayName}</div>
            <div class="text-content text-sm">
                {$t("pages.project.view.tabs.community.role.matchfunding")}
            </div>
        </div>
        {#if item.message}
            <p class="text-content line-clamp-2 text-sm">{item.message}</p>
        {/if}
    </div>
</button>
