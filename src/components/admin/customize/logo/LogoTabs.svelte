<script lang="ts">
    import { t } from "../../../../i18n/store";
    import PlusIcon from "../../../icons/actions/PlusIcon.svelte";
    import Clock from "../../../icons/Clock.svelte";

    interface Props {
        currentTab: string;
        onTabChange: (tabId: string) => void;
    }

    let { currentTab, onTabChange }: Props = $props();

    function tabClass(tabId: string): string {
        return currentTab === tabId
            ? "border-primary text-secondary"
            : "border-variant1 text-content";
    }
</script>

<div class="flex gap-0">
    <button
        class="hover:bg-primary-dark flex w-fit cursor-pointer items-center gap-2 rounded-t-lg border-b-2 px-6 py-2 text-base font-bold {tabClass(
            'new',
        )}"
        onclick={() => onTabChange("new")}
    >
        <PlusIcon class="text-secondary size-4" />
        {$t("pages.admin.customize.logo.tabs.new")}
    </button>
    <button
        class="hover:bg-primary-dark flex w-fit cursor-pointer items-center gap-2 rounded-t-lg border-b-2 px-6 py-2 text-base font-bold {tabClass(
            'history',
        )}"
        onclick={() => onTabChange("history")}
    >
        <Clock class="text-secondary size-4" />
        {$t("pages.admin.customize.logo.tabs.history")}
    </button>
</div>
