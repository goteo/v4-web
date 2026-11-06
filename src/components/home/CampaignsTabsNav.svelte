<script lang="ts">
    import { t } from "../../i18n/store";
    import Clock from "../icons/Clock.svelte";
    import Flash from "../icons/media/Flash.svelte";
    import Tabs from "../library/layout/Tabs.svelte";

    interface Props {
        activeTab?: string;
        onTabChange?: (tabId: string) => void;
        alignment?: "left" | "center";
    }

    let { activeTab = "ending-soon", onTabChange, alignment = "left" }: Props = $props();
</script>

{#snippet clockIconSnippet()}
    <Clock class="size-4" />
{/snippet}

{#snippet flashIconSnippet()}
    <Flash class="size-4" />
{/snippet}

<Tabs
    tabs={[
        {
            id: "ending-soon",
            label: $t("pages.home.campaigns.tabs.endingSoon"),
            icon: clockIconSnippet,
        },
        {
            id: "most-successful",
            label: $t("pages.home.campaigns.tabs.mostSuccessful"),
            icon: flashIconSnippet,
        },
    ]}
    {activeTab}
    {alignment}
    useDataAttributes={false}
    {onTabChange}
/>
